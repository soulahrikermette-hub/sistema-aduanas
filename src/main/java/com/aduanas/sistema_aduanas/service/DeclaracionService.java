package com.aduanas.sistema_aduanas.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aduanas.sistema_aduanas.exception.ConflictoException;
import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.repository.DeclaracionRepository;

// Lógica de negocio de las declaraciones.
// Guarda y lee los datos de la base de datos a través de DeclaracionRepository (JPA).
@Service
public class DeclaracionService {

    // Repositorio que habla con la base de datos (Spring lo inyecta solo)
    private final DeclaracionRepository repository;

    public DeclaracionService(DeclaracionRepository repository) {
        this.repository = repository;
    }

    // Registra una nueva declaración: la limpia, valida que el número no esté repetido
    // y le asigna estado PENDIENTE (si no trae uno). El ID lo genera la base de datos.
    @Transactional
    public Declaracion registrar(Declaracion nuevaDeclaracion) {
        limpiar(nuevaDeclaracion);
        validarNumeroUnico(nuevaDeclaracion.getNumeroDeclaracion(), null);

        if (nuevaDeclaracion.getEstado() == null) {
            nuevaDeclaracion.setEstado(Declaracion.ESTADO_PENDIENTE);
        }
        nuevaDeclaracion.setId(null); // por seguridad: así siempre se crea una nueva
        return repository.save(nuevaDeclaracion);
    }

    // Devuelve todas las declaraciones, ordenadas por ID
    @Transactional(readOnly = true)
    public List<Declaracion> listarTodas() {
        return repository.findAll(Sort.by("id"));
    }

    // Busca una declaración por su ID (Optional vacío si no existe)
    @Transactional(readOnly = true)
    public Optional<Declaracion> buscarPorId(Long id) {
        return repository.findById(id);
    }

    // Actualiza una declaración existente con los nuevos datos recibidos.
    // Devuelve Optional.empty() si no se encontró el ID (el controlador responde 404).
    // Si los datos no traen estado, se conserva el que ya tenía.
    @Transactional
    public Optional<Declaracion> actualizar(Long id, Declaracion datosActualizados) {
        Optional<Declaracion> existente = buscarPorId(id);
        if (existente.isEmpty()) {
            return Optional.empty();
        }

        limpiar(datosActualizados);
        validarNumeroUnico(datosActualizados.getNumeroDeclaracion(), id);

        Declaracion declaracion = existente.get();
        declaracion.setNumeroDeclaracion(datosActualizados.getNumeroDeclaracion());
        declaracion.setTipoOperacion(datosActualizados.getTipoOperacion());
        declaracion.setFecha(datosActualizados.getFecha());
        declaracion.setAduana(datosActualizados.getAduana());
        declaracion.setImportadorExportador(datosActualizados.getImportadorExportador());
        if (datosActualizados.getEstado() != null) {
            declaracion.setEstado(datosActualizados.getEstado());
        }
        return Optional.of(repository.save(declaracion));
    }

    // Cambia solo el estado de una declaración (pendiente, en revisión, aprobada, rechazada)
    @Transactional
    public Optional<Declaracion> cambiarEstado(Long id, String nuevoEstado) {
        Optional<Declaracion> existente = buscarPorId(id);
        existente.ifPresent(declaracion -> {
            declaracion.setEstado(nuevoEstado);
            repository.save(declaracion);
        });
        return existente;
    }

    // Elimina una declaración por ID.
    // Devuelve true si se eliminó, false si no existía (para que el controlador sepa qué responder)
    @Transactional
    public boolean eliminar(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    // Quita espacios sobrantes y deja el número en mayúsculas (dua-2026-1 -> DUA-2026-1)
    private void limpiar(Declaracion d) {
        if (d.getNumeroDeclaracion() != null) {
            d.setNumeroDeclaracion(d.getNumeroDeclaracion().trim().toUpperCase());
        }
        if (d.getAduana() != null) {
            d.setAduana(d.getAduana().trim());
        }
        if (d.getImportadorExportador() != null) {
            d.setImportadorExportador(d.getImportadorExportador().trim());
        }
    }

    // Lanza ConflictoException si OTRA declaración ya usa ese número.
    // idActual es el ID de la declaración que se está editando (null si es nueva),
    // así una declaración no choca consigo misma al guardarse.
    private void validarNumeroUnico(String numero, Long idActual) {
        boolean repetido = (idActual == null)
                ? repository.existsByNumeroDeclaracion(numero)
                : repository.existsByNumeroDeclaracionAndIdNot(numero, idActual);
        if (repetido) {
            throw new ConflictoException("numeroDeclaracion",
                    "Ya existe una declaración con el número " + numero + ".");
        }
    }
}

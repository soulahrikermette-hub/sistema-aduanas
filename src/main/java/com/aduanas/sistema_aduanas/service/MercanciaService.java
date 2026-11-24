package com.aduanas.sistema_aduanas.service;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aduanas.sistema_aduanas.model.Mercancia;
import com.aduanas.sistema_aduanas.repository.MercanciaRepository;

// Lógica de negocio de las mercancías (mismo patrón que DeclaracionService).
// Guarda y lee los datos de la base de datos a través de MercanciaRepository (JPA).
@Service
public class MercanciaService {

    // Repositorio que habla con la base de datos (Spring lo inyecta solo)
    private final MercanciaRepository repository;

    public MercanciaService(MercanciaRepository repository) {
        this.repository = repository;
    }

    // Registra una nueva mercancía. El ID lo genera la base de datos.
    @Transactional
    public Mercancia registrar(Mercancia nuevaMercancia) {
        limpiar(nuevaMercancia);
        nuevaMercancia.setId(null); // por seguridad: así siempre se crea una nueva
        return repository.save(nuevaMercancia);
    }

    // Devuelve todas las mercancías, ordenadas por ID
    @Transactional(readOnly = true)
    public List<Mercancia> listarTodas() {
        return repository.findAll(Sort.by("id"));
    }

    // Devuelve solo las mercancías que pertenecen a una declaración
    @Transactional(readOnly = true)
    public List<Mercancia> listarPorDeclaracion(Long declaracionId) {
        return repository.findByDeclaracionId(declaracionId);
    }

    // Busca una mercancía por su ID
    @Transactional(readOnly = true)
    public Optional<Mercancia> buscarPorId(Long id) {
        return repository.findById(id);
    }

    // Actualiza una mercancía existente (Optional vacío si no existe)
    @Transactional
    public Optional<Mercancia> actualizar(Long id, Mercancia datosActualizados) {
        Optional<Mercancia> existente = buscarPorId(id);
        if (existente.isEmpty()) {
            return Optional.empty();
        }

        limpiar(datosActualizados);

        Mercancia mercancia = existente.get();
        mercancia.setDeclaracionId(datosActualizados.getDeclaracionId());
        mercancia.setDescripcion(datosActualizados.getDescripcion());
        mercancia.setPartidaArancelaria(datosActualizados.getPartidaArancelaria());
        mercancia.setCantidad(datosActualizados.getCantidad());
        mercancia.setUnidadMedida(datosActualizados.getUnidadMedida());
        mercancia.setValor(datosActualizados.getValor());
        mercancia.setPeso(datosActualizados.getPeso());
        return Optional.of(repository.save(mercancia));
    }

    // Elimina una mercancía. true si existía, false si no.
    @Transactional
    public boolean eliminar(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    // Elimina TODAS las mercancías de una declaración (se usa al borrar la declaración).
    // Devuelve cuántas se eliminaron.
    @Transactional
    public int eliminarPorDeclaracion(Long declaracionId) {
        int cantidad = repository.findByDeclaracionId(declaracionId).size();
        repository.deleteByDeclaracionId(declaracionId);
        return cantidad;
    }

    // Quita espacios sobrantes de los textos
    private void limpiar(Mercancia m) {
        if (m.getDescripcion() != null) {
            m.setDescripcion(m.getDescripcion().trim());
        }
        if (m.getPartidaArancelaria() != null) {
            m.setPartidaArancelaria(m.getPartidaArancelaria().trim());
        }
        if (m.getUnidadMedida() != null) {
            m.setUnidadMedida(m.getUnidadMedida().trim());
        }
    }
}

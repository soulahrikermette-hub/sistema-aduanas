package com.aduanas.sistema_aduanas.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aduanas.sistema_aduanas.exception.ConflictoException;
import com.aduanas.sistema_aduanas.exception.SolicitudInvalidaException;
import com.aduanas.sistema_aduanas.model.Incidencia;
import com.aduanas.sistema_aduanas.repository.IncidenciaRepository;

// Lógica de negocio de las incidencias (mismo patrón que MercanciaService).
@Service
public class IncidenciaService {

    private final IncidenciaRepository repository;

    public IncidenciaService(IncidenciaRepository repository) {
        this.repository = repository;
    }

    // Registra una incidencia nueva. El servidor completa solo los datos de auditoría:
    // quién la registró (el usuario con sesión) y cuándo. Nada de eso viene del JSON.
    @Transactional
    public Incidencia registrar(Incidencia nueva, String usuario) {
        limpiar(nueva);
        validarFecha(nueva.getFecha());
        nueva.setId(null); // por seguridad: así siempre se crea una nueva
        if (nueva.getEstado() == null) {
            nueva.setEstado(Incidencia.ESTADO_ABIERTA);
        }
        nueva.setRegistradaPor(usuario);
        nueva.setFechaRegistro(LocalDateTime.now().withNano(0).toString());
        return repository.save(nueva);
    }

    // Devuelve todas las incidencias, las más recientes primero
    @Transactional(readOnly = true)
    public List<Incidencia> listarTodas() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    // Lista con filtros opcionales (los que lleguen null se ignoran)
    @Transactional(readOnly = true)
    public List<Incidencia> listar(Long mercanciaId, Long declaracionId, String tipo, String estado) {
        return listarTodas().stream()
                .filter(i -> mercanciaId == null || mercanciaId.equals(i.getMercanciaId()))
                .filter(i -> declaracionId == null || declaracionId.equals(i.getDeclaracionId()))
                .filter(i -> tipo == null || tipo.equals(i.getTipo()))
                .filter(i -> estado == null || estado.equals(i.getEstado()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Incidencia> buscarPorId(Long id) {
        return repository.findById(id);
    }

    // Actualiza los datos de una incidencia. Quién y cuándo la registró NO cambia; en cambio
    // se anota quién la modificó y cuándo. Una incidencia RESUELTA no se puede editar:
    // hay que reabrirla antes (y reabrir es solo del administrador, ver cambiarEstado).
    @Transactional
    public Optional<Incidencia> actualizar(Long id, Incidencia datos, String usuario) {
        Optional<Incidencia> existente = buscarPorId(id);
        if (existente.isEmpty()) {
            return Optional.empty();
        }
        if (Incidencia.ESTADO_RESUELTA.equals(existente.get().getEstado())) {
            throw new ConflictoException("estado",
                    "Una incidencia resuelta no se puede editar. Un administrador debe reabrirla primero.");
        }
        limpiar(datos);
        validarFecha(datos.getFecha());

        Incidencia incidencia = existente.get();
        anotarModificacion(incidencia, usuario);
        incidencia.setMercanciaId(datos.getMercanciaId());
        incidencia.setDeclaracionId(datos.getDeclaracionId());
        incidencia.setTipo(datos.getTipo());
        incidencia.setFecha(datos.getFecha());
        incidencia.setDescripcion(datos.getDescripcion());
        incidencia.setCantidadAfectada(datos.getCantidadAfectada());
        if (datos.getEstado() != null) {
            incidencia.setEstado(datos.getEstado());
        }
        return Optional.of(repository.save(incidencia));
    }

    // Cambia solo el estado del seguimiento (y deja anotado quién lo hizo).
    // Regla: sacar una incidencia de RESUELTA (reabrirla) solo puede hacerlo un administrador.
    @Transactional
    public Optional<Incidencia> cambiarEstado(Long id, String nuevoEstado, String usuario, boolean esAdmin) {
        Optional<Incidencia> existente = buscarPorId(id);
        if (existente.isPresent()) {
            Incidencia i = existente.get();
            boolean reabre = Incidencia.ESTADO_RESUELTA.equals(i.getEstado())
                    && !Incidencia.ESTADO_RESUELTA.equals(nuevoEstado);
            if (reabre && !esAdmin) {
                throw new ConflictoException("estado", "Solo un administrador puede reabrir una incidencia resuelta.");
            }
            if (!nuevoEstado.equals(i.getEstado())) {
                i.setEstado(nuevoEstado);
                anotarModificacion(i, usuario);
                repository.save(i);
            }
        }
        return existente;
    }

    // Elimina una incidencia. true si existía, false si no.
    @Transactional
    public boolean eliminar(Long id) {
        if (!repository.existsById(id)) {
            return false;
        }
        repository.deleteById(id);
        return true;
    }

    // Se usan al eliminar la mercancía o la declaración a la que pertenecían
    @Transactional
    public void eliminarPorMercancia(Long mercanciaId) {
        repository.deleteByMercanciaId(mercanciaId);
    }

    @Transactional
    public void eliminarPorDeclaracion(Long declaracionId) {
        repository.deleteByDeclaracionId(declaracionId);
    }

    // Cuántas incidencias siguen sin resolverse (abiertas o en investigación)
    @Transactional(readOnly = true)
    public long contarSinResolver() {
        return repository.countByEstado(Incidencia.ESTADO_ABIERTA)
                + repository.countByEstado(Incidencia.ESTADO_EN_INVESTIGACION);
    }

    // Deja anotado quién tocó la incidencia por última vez y cuándo
    private void anotarModificacion(Incidencia i, String usuario) {
        i.setModificadaPor(usuario);
        i.setFechaModificacion(LocalDateTime.now().withNano(0).toString());
    }

    // Una incidencia no puede ser de una fecha que todavía no llegó
    private void validarFecha(String fecha) {
        if (fecha != null && LocalDate.parse(fecha).isAfter(LocalDate.now())) {
            throw new SolicitudInvalidaException("fecha", "La fecha de la incidencia no puede ser futura.");
        }
    }

    // Quita espacios sobrantes de los textos
    private void limpiar(Incidencia i) {
        if (i.getDescripcion() != null) {
            i.setDescripcion(i.getDescripcion().trim());
        }
    }
}

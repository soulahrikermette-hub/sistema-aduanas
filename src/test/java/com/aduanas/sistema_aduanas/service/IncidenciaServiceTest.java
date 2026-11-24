package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.exception.ConflictoException;
import com.aduanas.sistema_aduanas.exception.SolicitudInvalidaException;
import com.aduanas.sistema_aduanas.model.Incidencia;
import com.aduanas.sistema_aduanas.repository.IncidenciaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Prueba las reglas de las incidencias SIN Spring ni base de datos:
// el repositorio es un falso que guarda todo en un mapa (mismo truco que UsuariosFalsos).
class IncidenciaServiceTest {

    private final Map<Long, Incidencia> tabla = new HashMap<>();
    private IncidenciaService servicio;
    private long siguienteId = 1;

    @BeforeEach
    void preparar() {
        IncidenciaRepository repositorio = (IncidenciaRepository) Proxy.newProxyInstance(
                IncidenciaRepository.class.getClassLoader(), new Class<?>[] { IncidenciaRepository.class },
                (proxy, metodo, args) -> switch (metodo.getName()) {
                    case "save" -> {
                        Incidencia i = (Incidencia) args[0];
                        if (i.getId() == null) {
                            i.setId(siguienteId++);
                        }
                        tabla.put(i.getId(), i);
                        yield i;
                    }
                    case "findById" -> Optional.ofNullable(tabla.get((Long) args[0]));
                    case "toString" -> "RepositorioFalso";
                    case "hashCode" -> System.identityHashCode(proxy);
                    case "equals" -> proxy == args[0];
                    default -> throw new UnsupportedOperationException(metodo.getName());
                });
        servicio = new IncidenciaService(repositorio);
    }

    private Incidencia nueva() {
        Incidencia i = new Incidencia();
        i.setMercanciaId(1L);
        i.setDeclaracionId(1L);
        i.setTipo("ROBO");
        i.setFecha(LocalDate.now().toString());
        i.setDescripcion("  Faltan tres cajas  ");
        return i;
    }

    @Test
    void alRegistrarElServidorPonePorDefectoLaAuditoria() {
        Incidencia guardada = servicio.registrar(nueva(), "funcionario");

        assertEquals("ABIERTA", guardada.getEstado());
        assertEquals("funcionario", guardada.getRegistradaPor());
        assertNotNull(guardada.getFechaRegistro());
        assertEquals("Faltan tres cajas", guardada.getDescripcion());   // se quitan los espacios sobrantes
        assertNull(guardada.getModificadaPor());                        // nadie la ha modificado todavía
    }

    @Test
    void noAceptaFechasFuturas() {
        Incidencia futura = nueva();
        futura.setFecha(LocalDate.now().plusDays(1).toString());

        assertThrows(SolicitudInvalidaException.class, () -> servicio.registrar(futura, "funcionario"));
    }

    @Test
    void editarDejaAnotadoQuienLoHizoPeroNoCambiaQuienLaRegistro() {
        Incidencia creada = servicio.registrar(nueva(), "funcionario");

        Incidencia cambios = nueva();
        cambios.setTipo("DANO");
        Incidencia editada = servicio.actualizar(creada.getId(), cambios, "admin").orElseThrow();

        assertEquals("DANO", editada.getTipo());
        assertEquals("funcionario", editada.getRegistradaPor());   // el autor original se conserva
        assertEquals("admin", editada.getModificadaPor());
        assertNotNull(editada.getFechaModificacion());
    }

    @Test
    void unaIncidenciaResueltaNoSePuedeEditar() {
        Incidencia creada = servicio.registrar(nueva(), "funcionario");
        servicio.cambiarEstado(creada.getId(), "RESUELTA", "funcionario", false);

        assertThrows(ConflictoException.class, () -> servicio.actualizar(creada.getId(), nueva(), "admin"));
    }

    @Test
    void soloElAdministradorPuedeReabrirUnaResuelta() {
        Incidencia creada = servicio.registrar(nueva(), "funcionario");
        servicio.cambiarEstado(creada.getId(), "RESUELTA", "funcionario", false);

        // El funcionario no puede reabrirla...
        assertThrows(ConflictoException.class,
                () -> servicio.cambiarEstado(creada.getId(), "ABIERTA", "funcionario", false));
        assertEquals("RESUELTA", tabla.get(creada.getId()).getEstado());

        // ...el administrador sí, y queda anotado quién lo hizo
        Incidencia reabierta = servicio.cambiarEstado(creada.getId(), "ABIERTA", "admin", true).orElseThrow();
        assertEquals("ABIERTA", reabierta.getEstado());
        assertEquals("admin", reabierta.getModificadaPor());
        assertTrue(reabierta.getFechaModificacion().length() >= 19);
    }

    @Test
    void cambiarAlMismoEstadoNoDejaRastro() {
        Incidencia creada = servicio.registrar(nueva(), "funcionario");

        Incidencia igual = servicio.cambiarEstado(creada.getId(), "ABIERTA", "admin", true).orElseThrow();

        assertNull(igual.getModificadaPor());
    }

    @Test
    void cambiarElEstadoDeUnaIncidenciaInexistenteDevuelveVacio() {
        assertTrue(servicio.cambiarEstado(999L, "RESUELTA", "admin", true).isEmpty());
    }
}

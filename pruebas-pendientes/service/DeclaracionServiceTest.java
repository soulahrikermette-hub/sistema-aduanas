package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.exception.ConflictoException;
import com.aduanas.sistema_aduanas.model.Declaracion;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas unitarias de DeclaracionService (TDD: se escribe la prueba y luego el código que la hace pasar)
class DeclaracionServiceTest {

    // Método auxiliar para no repetir el armado de una declaración en cada prueba
    private Declaracion nueva(String numero) {
        Declaracion d = new Declaracion();
        d.setNumeroDeclaracion(numero);
        d.setTipoOperacion("IMPORTACION");
        d.setFecha("2026-09-06");
        d.setAduana("Aduana Marítima del Callao");
        d.setImportadorExportador("Comercial Andina SAC");
        return d;
    }

    @Test
    void deberiaRegistrarUnaDeclaracionYAsignarleUnId() {
        // Arrange: preparamos el servicio y los datos de prueba
        DeclaracionService service = new DeclaracionService();

        // Act: ejecutamos la acción que queremos probar
        Declaracion resultado = service.registrar(nueva("DUA-2026-00123"));

        // Assert: verificamos que el resultado sea el esperado
        assertNotNull(resultado.getId(), "La declaración registrada debería tener un ID asignado");
        assertEquals("PENDIENTE", resultado.getEstado(), "El estado por defecto debería ser PENDIENTE");
    }

    @Test
    void deberiaListarLasDeclaracionesRegistradas() {
        // Arrange
        DeclaracionService service = new DeclaracionService();
        Declaracion d1 = nueva("DUA-2026-00001");
        d1.setTipoOperacion("EXPORTACION");

        // Act
        service.registrar(d1);
        List<Declaracion> todas = service.listarTodas();

        // Assert
        assertEquals(1, todas.size(), "Debería haber exactamente 1 declaración registrada");
    }

    @Test
    void noDeberiaPermitirDosDeclaracionesConElMismoNumero() {
        DeclaracionService service = new DeclaracionService();
        service.registrar(nueva("DUA-2026-00200"));

        // El mismo número en minúsculas también cuenta como repetido
        assertThrows(ConflictoException.class, () -> service.registrar(nueva("dua-2026-00200")));
        assertEquals(1, service.listarTodas().size());
    }

    @Test
    void deberiaDejarElNumeroEnMayusculasYSinEspacios() {
        DeclaracionService service = new DeclaracionService();

        Declaracion resultado = service.registrar(nueva("  dua-2026-00300 "));

        assertEquals("DUA-2026-00300", resultado.getNumeroDeclaracion());
    }

    @Test
    void deberiaActualizarSinPerderElEstado() {
        // Esta prueba protege contra un bug que existía: al editar, el estado volvía a PENDIENTE
        DeclaracionService service = new DeclaracionService();
        Declaracion registrada = service.registrar(nueva("DUA-2026-00400"));
        service.cambiarEstado(registrada.getId(), "APROBADA");

        Declaracion datos = nueva("DUA-2026-00400");
        datos.setAduana("Aduana de Paita");
        Optional<Declaracion> actualizada = service.actualizar(registrada.getId(), datos);

        assertTrue(actualizada.isPresent());
        assertEquals("Aduana de Paita", actualizada.get().getAduana());
        assertEquals("APROBADA", actualizada.get().getEstado(), "Editar no debe cambiar el estado");
    }

    @Test
    void deberiaPermitirGuardarUnaDeclaracionSinCambiarSuNumero() {
        // Una declaración no debe chocar consigo misma al editarse
        DeclaracionService service = new DeclaracionService();
        Declaracion registrada = service.registrar(nueva("DUA-2026-00500"));

        Optional<Declaracion> actualizada = service.actualizar(registrada.getId(), nueva("DUA-2026-00500"));

        assertTrue(actualizada.isPresent());
    }

    @Test
    void noDeberiaActualizarConElNumeroDeOtraDeclaracion() {
        DeclaracionService service = new DeclaracionService();
        service.registrar(nueva("DUA-2026-00601"));
        Declaracion segunda = service.registrar(nueva("DUA-2026-00602"));

        assertThrows(ConflictoException.class,
                () -> service.actualizar(segunda.getId(), nueva("DUA-2026-00601")));
    }

    @Test
    void deberiaDevolverVacioAlActualizarUnIdInexistente() {
        DeclaracionService service = new DeclaracionService();

        assertTrue(service.actualizar(99L, nueva("DUA-2026-00700")).isEmpty());
    }

    @Test
    void deberiaCambiarElEstado() {
        DeclaracionService service = new DeclaracionService();
        Declaracion registrada = service.registrar(nueva("DUA-2026-00800"));

        Optional<Declaracion> resultado = service.cambiarEstado(registrada.getId(), "EN_REVISION");

        assertTrue(resultado.isPresent());
        assertEquals("EN_REVISION", resultado.get().getEstado());
    }

    @Test
    void deberiaBuscarPorId() {
        DeclaracionService service = new DeclaracionService();
        Declaracion registrada = service.registrar(nueva("DUA-2026-00900"));

        assertTrue(service.buscarPorId(registrada.getId()).isPresent());
        assertTrue(service.buscarPorId(999L).isEmpty());
    }

    @Test
    void deberiaEliminarUnaDeclaracion() {
        DeclaracionService service = new DeclaracionService();
        Declaracion registrada = service.registrar(nueva("DUA-2026-01000"));

        assertTrue(service.eliminar(registrada.getId()));
        assertFalse(service.eliminar(registrada.getId()), "Eliminar dos veces debe devolver false");
        assertEquals(0, service.listarTodas().size());
    }
}

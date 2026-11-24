package com.aduanas.sistema_aduanas.service;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.aduanas.sistema_aduanas.model.Mercancia;

// Pruebas unitarias para MercanciaService (mismo patrón que DeclaracionServiceTest)
class MercanciaServiceTest {

    // Método auxiliar: arma una mercancía asociada a una declaración
    private Mercancia nueva(String descripcion, Long declaracionId) {
        Mercancia m = new Mercancia();
        m.setDeclaracionId(declaracionId);
        m.setDescripcion(descripcion);
        m.setPartidaArancelaria("8708.99.00");
        m.setCantidad(120.0);
        m.setUnidadMedida("unidades");
        m.setValor(4300.0);
        return m;
    }

    @Test
    void deberiaRegistrarUnaMercanciaYAsignarleUnId() {
        // Arrange
        MercanciaService service = new MercanciaService();

        // Act
        Mercancia resultado = service.registrar(nueva("Repuestos automotrices", 1L));

        // Assert
        assertNotNull(resultado.getId(), "La mercancía registrada debería tener un ID asignado");
    }

    @Test
    void deberiaListarLasMercanciasRegistradas() {
        // Arrange
        MercanciaService service = new MercanciaService();

        // Act
        service.registrar(nueva("Textiles", 1L));
        List<Mercancia> todas = service.listarTodas();

        // Assert
        assertEquals(1, todas.size(), "Debería haber exactamente 1 mercancía registrada");
    }

    @Test
    void deberiaListarSoloLasMercanciasDeUnaDeclaracion() {
        MercanciaService service = new MercanciaService();
        service.registrar(nueva("Textiles", 1L));
        service.registrar(nueva("Café", 2L));
        service.registrar(nueva("Cacao", 2L));

        assertEquals(1, service.listarPorDeclaracion(1L).size());
        assertEquals(2, service.listarPorDeclaracion(2L).size());
        assertEquals(0, service.listarPorDeclaracion(3L).size());
    }

    @Test
    void deberiaActualizarUnaMercancia() {
        MercanciaService service = new MercanciaService();
        Mercancia registrada = service.registrar(nueva("Textiles", 1L));

        Mercancia datos = nueva("Textiles de alpaca", 1L);
        datos.setValor(9999.0);
        Optional<Mercancia> actualizada = service.actualizar(registrada.getId(), datos);

        assertTrue(actualizada.isPresent());
        assertEquals("Textiles de alpaca", actualizada.get().getDescripcion());
        assertEquals(9999.0, actualizada.get().getValor());
    }

    @Test
    void deberiaDevolverVacioAlActualizarUnIdInexistente() {
        MercanciaService service = new MercanciaService();

        assertTrue(service.actualizar(99L, nueva("Nada", 1L)).isEmpty());
    }

    @Test
    void deberiaEliminarUnaMercancia() {
        MercanciaService service = new MercanciaService();
        Mercancia registrada = service.registrar(nueva("Textiles", 1L));

        assertTrue(service.eliminar(registrada.getId()));
        assertFalse(service.eliminar(registrada.getId()));
        assertEquals(0, service.listarTodas().size());
    }

    @Test
    void deberiaEliminarTodasLasMercanciasDeUnaDeclaracion() {
        MercanciaService service = new MercanciaService();
        service.registrar(nueva("Textiles", 1L));
        service.registrar(nueva("Café", 2L));
        service.registrar(nueva("Cacao", 2L));

        int eliminadas = service.eliminarPorDeclaracion(2L);

        assertEquals(2, eliminadas);
        assertEquals(1, service.listarTodas().size(), "Debe quedar solo la mercancía de la declaración 1");
    }
}

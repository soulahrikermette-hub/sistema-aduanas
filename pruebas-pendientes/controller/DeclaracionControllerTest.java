package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.exception.RecursoNoEncontradoException;
import com.aduanas.sistema_aduanas.exception.SolicitudInvalidaException;
import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.model.EstadoRequest;
import com.aduanas.sistema_aduanas.model.Mercancia;
import com.aduanas.sistema_aduanas.service.DeclaracionService;
import com.aduanas.sistema_aduanas.service.MercanciaService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas de los controladores sin levantar Spring: se crean a mano con servicios reales
// (que viven en memoria), así son rápidas y no dependen de ninguna configuración.
class DeclaracionControllerTest {

    private DeclaracionService declaraciones;
    private MercanciaService mercancias;
    private DeclaracionController controlador;
    private MercanciaController controladorMercancias;

    @BeforeEach
    void preparar() {
        declaraciones = new DeclaracionService();
        mercancias = new MercanciaService();
        controlador = new DeclaracionController(declaraciones, mercancias);
        controladorMercancias = new MercanciaController(mercancias, declaraciones);
    }

    private Declaracion nuevaDeclaracion(String numero) {
        Declaracion d = new Declaracion();
        d.setNumeroDeclaracion(numero);
        d.setTipoOperacion("EXPORTACION");
        d.setFecha("2026-09-06");
        d.setAduana("Aduana de Paita");
        d.setImportadorExportador("Frutos del Valle S.A.");
        return d;
    }

    private Mercancia nuevaMercancia(Long declaracionId) {
        Mercancia m = new Mercancia();
        m.setDeclaracionId(declaracionId);
        m.setDescripcion("Paltas Hass");
        m.setPartidaArancelaria("0804.40.00");
        m.setCantidad(25.0);
        m.setUnidadMedida("toneladas");
        m.setValor(41250.0);
        return m;
    }

    @Test
    void registrarDevuelve201ConLaUbicacionDelRecurso() {
        ResponseEntity<Declaracion> respuesta = controlador.registrar(nuevaDeclaracion("DUA-2026-00001"));

        assertEquals(201, respuesta.getStatusCode().value());
        assertNotNull(respuesta.getBody());
        assertEquals("/api/declaraciones/" + respuesta.getBody().getId(),
                respuesta.getHeaders().getLocation().toString());
    }

    @Test
    void obtenerUnaDeclaracionInexistenteLanza404() {
        assertThrows(RecursoNoEncontradoException.class, () -> controlador.obtenerPorId(99L));
    }

    @Test
    void cambiarEstadoActualizaLaDeclaracion() {
        Declaracion creada = controlador.registrar(nuevaDeclaracion("DUA-2026-00002")).getBody();

        Declaracion resultado = controlador.cambiarEstado(creada.getId(), new EstadoRequest("APROBADA"));

        assertEquals("APROBADA", resultado.getEstado());
    }

    @Test
    void cambiarEstadoDeUnaDeclaracionInexistenteLanza404() {
        assertThrows(RecursoNoEncontradoException.class,
                () -> controlador.cambiarEstado(99L, new EstadoRequest("APROBADA")));
    }

    @Test
    void eliminarUnaDeclaracionTambienEliminaSusMercancias() {
        Declaracion creada = controlador.registrar(nuevaDeclaracion("DUA-2026-00003")).getBody();
        Declaracion otra = controlador.registrar(nuevaDeclaracion("DUA-2026-00004")).getBody();
        controladorMercancias.registrar(nuevaMercancia(creada.getId()));
        controladorMercancias.registrar(nuevaMercancia(creada.getId()));
        controladorMercancias.registrar(nuevaMercancia(otra.getId()));

        ResponseEntity<Void> respuesta = controlador.eliminar(creada.getId());

        assertEquals(204, respuesta.getStatusCode().value());
        assertEquals(1, mercancias.listarTodas().size(), "Solo debe quedar la mercancía de la otra declaración");
    }

    @Test
    void eliminarUnaDeclaracionInexistenteLanza404() {
        assertThrows(RecursoNoEncontradoException.class, () -> controlador.eliminar(99L));
    }

    @Test
    void listarMercanciasDeUnaDeclaracionInexistenteLanza404() {
        assertThrows(RecursoNoEncontradoException.class, () -> controlador.listarMercancias(99L));
    }

    @Test
    void noSePuedeRegistrarUnaMercanciaEnUnaDeclaracionQueNoExiste() {
        assertThrows(SolicitudInvalidaException.class,
                () -> controladorMercancias.registrar(nuevaMercancia(99L)));
    }

    @Test
    void registrarMercanciaDevuelve201() {
        Declaracion creada = controlador.registrar(nuevaDeclaracion("DUA-2026-00005")).getBody();

        ResponseEntity<Mercancia> respuesta = controladorMercancias.registrar(nuevaMercancia(creada.getId()));

        assertEquals(201, respuesta.getStatusCode().value());
        assertEquals(1, controlador.listarMercancias(creada.getId()).size());
    }

    @Test
    void eliminarUnaMercanciaInexistenteLanza404() {
        assertThrows(RecursoNoEncontradoException.class, () -> controladorMercancias.eliminar(99L));
    }
}

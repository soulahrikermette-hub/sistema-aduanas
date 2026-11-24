package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.model.Estadisticas;
import com.aduanas.sistema_aduanas.model.Mercancia;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

// Pruebas del cálculo que alimenta el panel principal
class EstadisticasServiceTest {

    private Declaracion declaracion(DeclaracionService service, String numero, String tipo, String estado) {
        Declaracion d = new Declaracion();
        d.setNumeroDeclaracion(numero);
        d.setTipoOperacion(tipo);
        d.setFecha("2026-09-06");
        d.setAduana("Aduana de Paita");
        d.setImportadorExportador("Empresa de prueba");
        d.setEstado(estado);
        return service.registrar(d);
    }

    private void mercancia(MercanciaService service, Long declaracionId, double valor, Double peso) {
        Mercancia m = new Mercancia();
        m.setDeclaracionId(declaracionId);
        m.setDescripcion("Producto");
        m.setPartidaArancelaria("8708.99.00");
        m.setCantidad(1.0);
        m.setUnidadMedida("unidades");
        m.setValor(valor);
        m.setPeso(peso);
        service.registrar(m);
    }

    @Test
    void deberiaDevolverTodoEnCeroCuandoNoHayDatos() {
        EstadisticasService service = new EstadisticasService(new DeclaracionService(), new MercanciaService());

        Estadisticas resultado = service.calcular();

        assertEquals(0, resultado.totalDeclaraciones());
        assertEquals(0, resultado.totalMercancias());
        assertEquals(0.0, resultado.valorTotal());
        assertEquals(4, resultado.porEstado().size(), "Los 4 estados deben aparecer siempre");
    }

    @Test
    void deberiaCalcularTotalesYValoresPorTipoDeOperacion() {
        DeclaracionService declaraciones = new DeclaracionService();
        MercanciaService mercancias = new MercanciaService();
        Declaracion imp = declaracion(declaraciones, "DUA-1", "IMPORTACION", "APROBADA");
        Declaracion exp1 = declaracion(declaraciones, "DUA-2", "EXPORTACION", "PENDIENTE");
        declaracion(declaraciones, "DUA-3", "EXPORTACION", "PENDIENTE");

        mercancia(mercancias, imp.getId(), 1000.50, 10.0);
        mercancia(mercancias, exp1.getId(), 2000.25, null); // sin peso: cuenta como 0

        Estadisticas resultado = new EstadisticasService(declaraciones, mercancias).calcular();

        assertEquals(3, resultado.totalDeclaraciones());
        assertEquals(1, resultado.importaciones());
        assertEquals(2, resultado.exportaciones());
        assertEquals(1, resultado.porEstado().get("APROBADA"));
        assertEquals(2, resultado.porEstado().get("PENDIENTE"));
        assertEquals(0, resultado.porEstado().get("RECHAZADA"));
        assertEquals(2, resultado.totalMercancias());
        assertEquals(3000.75, resultado.valorTotal());
        assertEquals(1000.5, resultado.valorImportacion());
        assertEquals(2000.25, resultado.valorExportacion());
        assertEquals(10.0, resultado.pesoTotal());
    }
}

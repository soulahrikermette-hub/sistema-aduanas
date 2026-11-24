package com.aduanas.sistema_aduanas.config;

import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.model.Mercancia;
import com.aduanas.sistema_aduanas.service.DeclaracionService;
import com.aduanas.sistema_aduanas.service.MercanciaService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

// Carga datos de ejemplo al iniciar la aplicación, para que la página no se vea vacía.
// Como todavía no hay base de datos, todo vive en memoria y se pierde al reiniciar:
// con esta clase siempre hay algo que mostrar.
//
// Para apagarlo, pon  aduanas.datos-demo=false  en application.properties
// (hazlo cuando conectes la base de datos real).
@Component
public class DatosDemo implements CommandLineRunner {

    private final DeclaracionService declaraciones;
    private final MercanciaService mercancias;

    // Lee la propiedad aduanas.datos-demo (si no existe, queda activado)
    @Value("${aduanas.datos-demo:true}")
    private boolean activo;

    public DatosDemo(DeclaracionService declaraciones, MercanciaService mercancias) {
        this.declaraciones = declaraciones;
        this.mercancias = mercancias;
    }

    @Override
    public void run(String... args) {
        // No hacemos nada si está apagado o si ya hay datos cargados
        if (!activo || !declaraciones.listarTodas().isEmpty()) {
            return;
        }

        // --- Importación aprobada: repuestos y neumáticos ---
        Declaracion d1 = declaracion("DUA-2026-00101", "IMPORTACION", "2026-08-18",
                "Aduana Marítima del Callao", "Comercial Andina S.A.C.", Declaracion.ESTADO_APROBADA);
        mercancia(d1, "Repuestos automotrices (frenos y pastillas)", "8708.30.00", 120, "unidades", 4300, 380);
        mercancia(d1, "Neumáticos nuevos para camión", "4011.20.00", 300, "unidades", 27000, 15000);

        // --- Exportación aprobada: arándanos y espárragos ---
        Declaracion d2 = declaracion("DUA-2026-00102", "EXPORTACION", "2026-08-22",
                "Aduana Aérea y Postal del Callao", "Agroexport Pacífico S.A.C.", Declaracion.ESTADO_APROBADA);
        mercancia(d2, "Arándanos frescos", "0810.40.00", 12, "toneladas", 78000, 12000);
        mercancia(d2, "Espárragos frescos", "0709.20.00", 22, "toneladas", 39600, 22000);

        // --- Importación aprobada: tecnología ---
        Declaracion d3 = declaracion("DUA-2026-00103", "IMPORTACION", "2026-08-27",
                "Aduana Aérea y Postal del Callao", "Tecnologías del Perú S.R.L.", Declaracion.ESTADO_APROBADA);
        mercancia(d3, "Computadoras portátiles", "8471.30.00", 85, "unidades", 62500, 190);
        mercancia(d3, "Teléfonos celulares", "8517.13.00", 200, "unidades", 48000, 60);

        // --- Exportación aprobada: paltas y cacao ---
        Declaracion d4 = declaracion("DUA-2026-00104", "EXPORTACION", "2026-09-03",
                "Aduana de Paita", "Frutos del Valle S.A.", Declaracion.ESTADO_APROBADA);
        mercancia(d4, "Paltas Hass", "0804.40.00", 25, "toneladas", 41250, 25000);
        mercancia(d4, "Cacao en grano", "1801.00.00", 14, "toneladas", 49000, 14000);

        // --- Importación aprobada: maquinaria minera ---
        Declaracion d5 = declaracion("DUA-2026-00105", "IMPORTACION", "2026-09-08",
                "Aduana Marítima del Callao", "Importadora Los Cedros S.A.C.", Declaracion.ESTADO_APROBADA);
        mercancia(d5, "Repuestos para perforadoras", "8431.43.00", 6, "unidades", 125000, 5400);

        // --- En revisión ---
        Declaracion d6 = declaracion("DUA-2026-00106", "EXPORTACION", "2026-09-12",
                "Aduana de Salaverry", "Pesquera Humboldt S.A.", Declaracion.ESTADO_EN_REVISION);
        mercancia(d6, "Harina de pescado", "2301.20.00", 40, "toneladas", 88000, 40000);

        Declaracion d7 = declaracion("DUA-2026-00107", "IMPORTACION", "2026-09-17",
                "Aduana Marítima del Callao", "Farmacéutica Inca S.A.", Declaracion.ESTADO_EN_REVISION);
        mercancia(d7, "Medicamentos genéricos", "3004.90.00", 15, "cajas", 21800, 240);

        Declaracion d8 = declaracion("DUA-2026-00108", "EXPORTACION", "2026-09-24",
                "Aduana de Tacna", "Textiles del Sur E.I.R.L.", Declaracion.ESTADO_EN_REVISION);
        mercancia(d8, "Prendas de alpaca", "6110.19.00", 650, "unidades", 32500, 310);
        mercancia(d8, "Camisetas de algodón", "6109.10.00", 4000, "unidades", 18400, 800);

        // --- Pendientes ---
        Declaracion d9 = declaracion("DUA-2026-00109", "EXPORTACION", "2026-09-30",
                "Aduana de Pisco", "Café de Selva Perú S.A.C.", Declaracion.ESTADO_PENDIENTE);
        mercancia(d9, "Café verde en grano", "0901.11.00", 18, "toneladas", 54000, 18000);

        Declaracion d10 = declaracion("DUA-2026-00110", "IMPORTACION", "2026-10-02",
                "Aduana de Puno", "Distribuidora Santa Rosa S.A.C.", Declaracion.ESTADO_PENDIENTE);
        mercancia(d10, "Lavadoras automáticas", "8450.11.00", 90, "unidades", 31500, 3600);

        Declaracion d11 = declaracion("DUA-2026-00111", "EXPORTACION", "2026-10-05",
                "Aduana de Paita", "Maderas de la Amazonía S.A.C.", Declaracion.ESTADO_PENDIENTE);
        mercancia(d11, "Madera aserrada", "4407.29.00", 60, "m³", 36000, 42000);

        // --- Rechazada ---
        Declaracion d12 = declaracion("DUA-2026-00112", "IMPORTACION", "2026-09-21",
                "Aduana Marítima del Callao", "Minera Altiplano S.A.", Declaracion.ESTADO_RECHAZADA);
        mercancia(d12, "Equipos de bombeo", "8413.70.00", 4, "unidades", 18900, 1200);
    }

    // Crea y registra una declaración de ejemplo
    private Declaracion declaracion(String numero, String tipo, String fecha, String aduana,
                                    String empresa, String estado) {
        Declaracion d = new Declaracion();
        d.setNumeroDeclaracion(numero);
        d.setTipoOperacion(tipo);
        d.setFecha(fecha);
        d.setAduana(aduana);
        d.setImportadorExportador(empresa);
        d.setEstado(estado);
        return declaraciones.registrar(d);
    }

    // Crea y registra una mercancía de ejemplo dentro de una declaración
    private void mercancia(Declaracion declaracion, String descripcion, String partida,
                           double cantidad, String unidad, double valor, double peso) {
        Mercancia m = new Mercancia();
        m.setDeclaracionId(declaracion.getId());
        m.setDescripcion(descripcion);
        m.setPartidaArancelaria(partida);
        m.setCantidad(cantidad);
        m.setUnidadMedida(unidad);
        m.setValor(valor);
        m.setPeso(peso);
        mercancias.registrar(m);
    }
}

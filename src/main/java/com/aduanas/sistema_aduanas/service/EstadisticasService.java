package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.model.Declaracion;
import com.aduanas.sistema_aduanas.model.Estadisticas;
import com.aduanas.sistema_aduanas.model.Mercancia;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Calcula los números del panel principal a partir de las declaraciones y mercancías registradas.
@Service
public class EstadisticasService {

    private final DeclaracionService declaraciones;
    private final MercanciaService mercancias;
    private final IncidenciaService incidencias;

    // Spring inyecta los servicios (inyección de dependencias por constructor)
    public EstadisticasService(DeclaracionService declaraciones, MercanciaService mercancias, IncidenciaService incidencias) {
        this.declaraciones = declaraciones;
        this.mercancias = mercancias;
        this.incidencias = incidencias;
    }

    public Estadisticas calcular() {
        List<Declaracion> listaDeclaraciones = declaraciones.listarTodas();
        List<Mercancia> listaMercancias = mercancias.listarTodas();

        // Todos los estados aparecen siempre, aunque tengan 0, para que el panel no "salte"
        Map<String, Integer> porEstado = new LinkedHashMap<>();
        porEstado.put(Declaracion.ESTADO_PENDIENTE, 0);
        porEstado.put(Declaracion.ESTADO_EN_REVISION, 0);
        porEstado.put(Declaracion.ESTADO_APROBADA, 0);
        porEstado.put(Declaracion.ESTADO_RECHAZADA, 0);

        // Guardamos el tipo de cada declaración para saber si sus mercancías son de importación o exportación
        Map<Long, String> tipoPorDeclaracion = new HashMap<>();
        int importaciones = 0;
        int exportaciones = 0;

        for (Declaracion d : listaDeclaraciones) {
            tipoPorDeclaracion.put(d.getId(), d.getTipoOperacion());
            if ("IMPORTACION".equals(d.getTipoOperacion())) {
                importaciones++;
            } else if ("EXPORTACION".equals(d.getTipoOperacion())) {
                exportaciones++;
            }
            if (d.getEstado() != null) {
                porEstado.merge(d.getEstado(), 1, Integer::sum);
            }
        }

        double valorTotal = 0;
        double valorImportacion = 0;
        double valorExportacion = 0;
        double pesoTotal = 0;

        for (Mercancia m : listaMercancias) {
            double valor = m.getValor() == null ? 0 : m.getValor();
            valorTotal += valor;
            pesoTotal += m.getPeso() == null ? 0 : m.getPeso();

            String tipo = tipoPorDeclaracion.get(m.getDeclaracionId());
            if ("IMPORTACION".equals(tipo)) {
                valorImportacion += valor;
            } else if ("EXPORTACION".equals(tipo)) {
                valorExportacion += valor;
            }
        }

        return new Estadisticas(
                listaDeclaraciones.size(),
                importaciones,
                exportaciones,
                porEstado,
                listaMercancias.size(),
                redondear(valorTotal),
                redondear(valorImportacion),
                redondear(valorExportacion),
                redondear(pesoTotal),
                incidencias.contarSinResolver());
    }

    // Redondea a 2 decimales (evita resultados como 0.30000000000000004)
    private double redondear(double numero) {
        return Math.round(numero * 100.0) / 100.0;
    }
}

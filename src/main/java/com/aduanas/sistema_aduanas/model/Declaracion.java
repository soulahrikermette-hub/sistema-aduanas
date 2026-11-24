package com.aduanas.sistema_aduanas.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Clase modelo (POJO) que representa una Declaración aduanera.
// Es una entidad JPA: se guarda en la tabla "declaraciones" de la base de datos (Supabase/PostgreSQL).
@Entity
@Table(name = "declaraciones")
public class Declaracion {

    // Estados posibles del trámite. Se usan en las validaciones y en el servicio.
    public static final String ESTADO_PENDIENTE = "PENDIENTE";
    public static final String ESTADO_EN_REVISION = "EN_REVISION";
    public static final String ESTADO_APROBADA = "APROBADA";
    public static final String ESTADO_RECHAZADA = "RECHAZADA";

    // Expresiones regulares reutilizables (también las usa EstadoRequest)
    public static final String REGEX_ESTADO = "PENDIENTE|EN_REVISION|APROBADA|RECHAZADA";
    public static final String REGEX_TIPO = "IMPORTACION|EXPORTACION";
    // Fecha con formato AAAA-MM-DD, validando que el mes sea 01-12 y el día 01-31
    public static final String REGEX_FECHA = "\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])";

    // Identificador único de la declaración (lo genera la base de datos, autoincremental)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Número oficial de la declaración (ej: DUA-2026-00123). No se puede repetir.
    @NotBlank(message = "El número de declaración es obligatorio")
    @Size(max = 30, message = "El número de declaración no puede superar los 30 caracteres")
    @Column(nullable = false, unique = true, length = 30)
    private String numeroDeclaracion;

    // Tipo de operación: "IMPORTACION" o "EXPORTACION"
    @NotBlank(message = "El tipo de operación es obligatorio")
    @Pattern(regexp = REGEX_TIPO, message = "El tipo de operación debe ser IMPORTACION o EXPORTACION")
    @Column(nullable = false, length = 15)
    private String tipoOperacion;

    // Fecha en la que se registra la declaración (texto con formato AAAA-MM-DD)
    @NotBlank(message = "La fecha es obligatoria")
    @Pattern(regexp = REGEX_FECHA, message = "La fecha debe tener el formato AAAA-MM-DD")
    @Column(nullable = false, length = 10)
    private String fecha;

    // Aduana donde se realiza el trámite (ej: "Aduana Marítima del Callao")
    @NotBlank(message = "La aduana es obligatoria")
    @Size(max = 80, message = "El nombre de la aduana no puede superar los 80 caracteres")
    @Column(nullable = false, length = 80)
    private String aduana;

    // Nombre o razón social de quien importa o exporta
    @NotBlank(message = "El importador/exportador es obligatorio")
    @Size(max = 120, message = "El nombre del importador/exportador no puede superar los 120 caracteres")
    @Column(nullable = false, length = 120)
    private String importadorExportador;

    // Estado del trámite. Es opcional al crear: si no se envía, el servicio la deja en PENDIENTE.
    // (Antes tenía un valor por defecto aquí, y eso hacía que al editar se volviera a PENDIENTE.)
    @Pattern(regexp = REGEX_ESTADO, message = "El estado debe ser PENDIENTE, EN_REVISION, APROBADA o RECHAZADA")
    @Column(nullable = false, length = 15)
    private String estado;

    // --- Getters y setters ---
    // Spring los necesita para poder convertir JSON <-> objeto Java automáticamente

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNumeroDeclaracion() {
        return numeroDeclaracion;
    }

    public void setNumeroDeclaracion(String numeroDeclaracion) {
        this.numeroDeclaracion = numeroDeclaracion;
    }

    public String getTipoOperacion() {
        return tipoOperacion;
    }

    public void setTipoOperacion(String tipoOperacion) {
        this.tipoOperacion = tipoOperacion;
    }

    public String getFecha() {
        return fecha;
    }

    public void setFecha(String fecha) {
        this.fecha = fecha;
    }

    public String getAduana() {
        return aduana;
    }

    public void setAduana(String aduana) {
        this.aduana = aduana;
    }

    public String getImportadorExportador() {
        return importadorExportador;
    }

    public void setImportadorExportador(String importadorExportador) {
        this.importadorExportador = importadorExportador;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }
}

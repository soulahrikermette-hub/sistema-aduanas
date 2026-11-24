package com.aduanas.sistema_aduanas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

// Clase modelo que representa una Incidencia: algo que le pasó a una mercancía
// (pérdida, extravío, robo o daño). Cada incidencia pertenece a UNA mercancía.
// Es una entidad JPA: se guarda en la tabla "incidencias" (Hibernate la crea sola).
@Entity
@Table(name = "incidencias")
public class Incidencia {

    // Tipos de incidencia (se usan en las validaciones)
    public static final String TIPO_PERDIDA = "PERDIDA";
    public static final String TIPO_EXTRAVIO = "EXTRAVIO";
    public static final String TIPO_ROBO = "ROBO";
    public static final String TIPO_DANO = "DANO";

    // Estados de la incidencia: nace ABIERTA, pasa a EN_INVESTIGACION y termina RESUELTA
    public static final String ESTADO_ABIERTA = "ABIERTA";
    public static final String ESTADO_EN_INVESTIGACION = "EN_INVESTIGACION";
    public static final String ESTADO_RESUELTA = "RESUELTA";

    // Expresiones regulares reutilizables (también las usa EstadoIncidenciaRequest)
    public static final String REGEX_TIPO = "PERDIDA|EXTRAVIO|ROBO|DANO";
    public static final String REGEX_ESTADO = "ABIERTA|EN_INVESTIGACION|RESUELTA";

    // Identificador único (lo genera la base de datos, autoincremental)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mercancía afectada (obligatoria: toda incidencia es sobre una mercancía)
    @NotNull(message = "La mercancía afectada es obligatoria")
    @Column(nullable = false)
    private Long mercanciaId;

    // Declaración de esa mercancía. NO la envía quien usa la API: el servidor la
    // calcula a partir de la mercancía, así nunca se contradicen.
    @Column(nullable = false)
    private Long declaracionId;

    // Tipo de incidencia: PERDIDA, EXTRAVIO, ROBO o DANO
    @NotBlank(message = "El tipo de incidencia es obligatorio")
    @Pattern(regexp = REGEX_TIPO, message = "El tipo debe ser PERDIDA, EXTRAVIO, ROBO o DANO")
    @Column(nullable = false, length = 10)
    private String tipo;

    // Fecha en que ocurrió (texto AAAA-MM-DD, igual que las declaraciones). No puede ser futura.
    @NotBlank(message = "La fecha es obligatoria")
    @Pattern(regexp = Declaracion.REGEX_FECHA, message = "La fecha debe tener el formato AAAA-MM-DD")
    @Column(nullable = false, length = 10)
    private String fecha;

    // Qué pasó, con las palabras de quien lo reporta
    @NotBlank(message = "La descripción es obligatoria")
    @Size(max = 300, message = "La descripción no puede superar los 300 caracteres")
    @Column(nullable = false, length = 300)
    private String descripcion;

    // Cuánta cantidad de la mercancía se afectó (opcional: a veces no se sabe aún)
    @Positive(message = "La cantidad afectada debe ser mayor a 0")
    @Column(nullable = true)
    private Double cantidadAfectada;

    // Estado del seguimiento. Si no se envía, el servidor pone ABIERTA.
    @Pattern(regexp = REGEX_ESTADO, message = "El estado debe ser ABIERTA, EN_INVESTIGACION o RESUELTA")
    @Column(nullable = false, length = 16)
    private String estado;

    // --- Auditoría automática: la llena el servidor con el usuario de la sesión, nunca quien envía el JSON ---

    // Usuario que registró la incidencia (ej: "funcionario")
    @Column(nullable = false, length = 50)
    private String registradaPor;

    // Fecha y hora del registro (texto ISO, ej: 2026-11-04T10:42:07)
    @Column(nullable = false, length = 19)
    private String fechaRegistro;

    // Rastro de la ÚLTIMA modificación (también automático). Quedan vacíos mientras nadie la toque.
    // Sirve para que una incidencia no se pueda "arreglar" después sin dejar señal.
    @Column(nullable = true, length = 50)
    private String modificadaPor;

    @Column(nullable = true, length = 19)
    private String fechaModificacion;

    // --- Getters y setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMercanciaId() { return mercanciaId; }
    public void setMercanciaId(Long mercanciaId) { this.mercanciaId = mercanciaId; }

    public Long getDeclaracionId() { return declaracionId; }
    public void setDeclaracionId(Long declaracionId) { this.declaracionId = declaracionId; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public Double getCantidadAfectada() { return cantidadAfectada; }
    public void setCantidadAfectada(Double cantidadAfectada) { this.cantidadAfectada = cantidadAfectada; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    public String getRegistradaPor() { return registradaPor; }
    public void setRegistradaPor(String registradaPor) { this.registradaPor = registradaPor; }

    public String getFechaRegistro() { return fechaRegistro; }
    public void setFechaRegistro(String fechaRegistro) { this.fechaRegistro = fechaRegistro; }

    public String getModificadaPor() { return modificadaPor; }
    public void setModificadaPor(String modificadaPor) { this.modificadaPor = modificadaPor; }

    public String getFechaModificacion() { return fechaModificacion; }
    public void setFechaModificacion(String fechaModificacion) { this.fechaModificacion = fechaModificacion; }
}

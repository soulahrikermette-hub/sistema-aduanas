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
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

// Clase modelo que representa una Mercancía dentro de una declaración.
// Cada mercancía pertenece a UNA declaración (relación uno a muchos).
// Es una entidad JPA: se guarda en la tabla "mercancias". La relación con "declaraciones"
// se refuerza en la base de datos con una llave foránea (declaracion_id).
@Entity
@Table(name = "mercancias")
public class Mercancia {

    // Identificador único (lo genera la base de datos, autoincremental)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ID de la declaración a la que pertenece esta mercancía
    @NotNull(message = "La declaración asociada es obligatoria")
    @Column(nullable = false)
    private Long declaracionId;

    // Descripción del producto (ej: "Repuestos automotrices")
    @NotBlank(message = "La descripción es obligatoria")
    @Size(max = 150, message = "La descripción no puede superar los 150 caracteres")
    @Column(nullable = false, length = 150)
    private String descripcion;

    // Código de partida arancelaria, con formato 0000.00.00 (opcionalmente 0000.00.00.00)
    @NotBlank(message = "La partida arancelaria es obligatoria")
    @Pattern(regexp = "\\d{4}\\.\\d{2}\\.\\d{2}(\\.\\d{2})?",
            message = "La partida arancelaria debe tener el formato 0000.00.00")
    @Column(nullable = false, length = 15)
    private String partidaArancelaria;

    // Cantidad de unidades, kilos, etc.
    // @Positive valida que sea mayor a 0 (no acepta 0 ni negativos)
    @NotNull(message = "La cantidad es obligatoria")
    @Positive(message = "La cantidad debe ser mayor a 0")
    @Column(nullable = false)
    private Double cantidad;

    // Unidad de medida (ej: "unidades", "kg", "toneladas")
    @NotBlank(message = "La unidad de medida es obligatoria")
    @Size(max = 30, message = "La unidad de medida no puede superar los 30 caracteres")
    @Column(nullable = false, length = 30)
    private String unidadMedida;

    // Valor declarado de la mercancía (en dólares)
    @NotNull(message = "El valor es obligatorio")
    @Positive(message = "El valor debe ser mayor a 0")
    @Column(nullable = false)
    private Double valor;

    // Peso en kg (opcional, no todos los productos lo requieren estrictamente)
    @PositiveOrZero(message = "El peso no puede ser negativo")
    @Column(nullable = true)
    private Double peso;

    // --- Getters y setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getDeclaracionId() { return declaracionId; }
    public void setDeclaracionId(Long declaracionId) { this.declaracionId = declaracionId; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getPartidaArancelaria() { return partidaArancelaria; }
    public void setPartidaArancelaria(String partidaArancelaria) { this.partidaArancelaria = partidaArancelaria; }

    public Double getCantidad() { return cantidad; }
    public void setCantidad(Double cantidad) { this.cantidad = cantidad; }

    public String getUnidadMedida() { return unidadMedida; }
    public void setUnidadMedida(String unidadMedida) { this.unidadMedida = unidadMedida; }

    public Double getValor() { return valor; }
    public void setValor(Double valor) { this.valor = valor; }

    public Double getPeso() { return peso; }
    public void setPeso(Double peso) { this.peso = peso; }
}

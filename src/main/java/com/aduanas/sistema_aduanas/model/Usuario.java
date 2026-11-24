package com.aduanas.sistema_aduanas.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Usuario del sistema (quien inicia sesión). Es una entidad JPA: se guarda en la tabla "usuarios".
// La contraseña NUNCA se guarda en texto plano: solo su hash PBKDF2 (con sal) en "clave_hash".
@Entity
@Table(name = "usuarios")
public class Usuario {

    // Identificador único (lo genera la base de datos, autoincremental)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Nombre de usuario para iniciar sesión (ej: "admin"). No se puede repetir.
    @Column(nullable = false, unique = true, length = 30)
    private String usuario;

    // Nombre para mostrar en la página (ej: "Administrador")
    @Column(nullable = false, length = 80)
    private String nombre;

    // Rol: ADMIN (puede eliminar) o FUNCIONARIO (no puede eliminar)
    @Column(nullable = false, length = 15)
    private String rol;

    // Hash de la contraseña, con el formato  pbkdf2$iteraciones$sal$hash  (todo en Base64)
    @Column(nullable = false, length = 200)
    private String claveHash;

    // JPA necesita un constructor vacío
    protected Usuario() {
    }

    public Usuario(String usuario, String nombre, String rol, String claveHash) {
        this.usuario = usuario;
        this.nombre = nombre;
        this.rol = rol;
        this.claveHash = claveHash;
    }

    // --- Getters y setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsuario() { return usuario; }
    public void setUsuario(String usuario) { this.usuario = usuario; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }

    public String getClaveHash() { return claveHash; }
    public void setClaveHash(String claveHash) { this.claveHash = claveHash; }
}

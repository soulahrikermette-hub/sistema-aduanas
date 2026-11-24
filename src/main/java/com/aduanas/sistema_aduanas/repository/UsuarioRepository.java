package com.aduanas.sistema_aduanas.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aduanas.sistema_aduanas.model.Usuario;

// Repositorio de usuarios: Spring genera solo guardar, buscar y contar.
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    // Busca un usuario por su nombre de usuario (vacío si no existe)
    Optional<Usuario> findByUsuario(String usuario);
}

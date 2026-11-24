package com.aduanas.sistema_aduanas.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aduanas.sistema_aduanas.model.Mercancia;

// Repositorio de mercancías: Spring genera solo guardar, buscar y borrar.
public interface MercanciaRepository extends JpaRepository<Mercancia, Long> {

    // Devuelve las mercancías de una declaración
    List<Mercancia> findByDeclaracionId(Long declaracionId);

    // Borra todas las mercancías de una declaración (se usa al eliminar la declaración)
    void deleteByDeclaracionId(Long declaracionId);
}

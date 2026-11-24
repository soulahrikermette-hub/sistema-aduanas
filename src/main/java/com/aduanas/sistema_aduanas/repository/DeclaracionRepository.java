package com.aduanas.sistema_aduanas.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aduanas.sistema_aduanas.model.Declaracion;

// Repositorio de declaraciones: Spring genera solo guardar, buscar y borrar.
public interface DeclaracionRepository extends JpaRepository<Declaracion, Long> {

    // Dice si ya existe una declaración con ese número (para evitar duplicados al crear)
    boolean existsByNumeroDeclaracion(String numeroDeclaracion);

    // Igual, pero ignorando una declaración concreta (para cuando se modifica)
    boolean existsByNumeroDeclaracionAndIdNot(String numeroDeclaracion, Long id);
}

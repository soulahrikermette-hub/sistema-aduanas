package com.aduanas.sistema_aduanas.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aduanas.sistema_aduanas.model.Incidencia;

// Repositorio de incidencias: Spring genera solo guardar, buscar y borrar.
public interface IncidenciaRepository extends JpaRepository<Incidencia, Long> {

    // Incidencias de una mercancía
    List<Incidencia> findByMercanciaId(Long mercanciaId);

    // Incidencias de una declaración
    List<Incidencia> findByDeclaracionId(Long declaracionId);

    // Se usan al borrar una mercancía o una declaración (para no dejar incidencias huérfanas)
    void deleteByMercanciaId(Long mercanciaId);

    void deleteByDeclaracionId(Long declaracionId);

    // Cuántas incidencias hay en cada estado (para el panel)
    long countByEstado(String estado);
}

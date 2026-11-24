package com.aduanas.sistema_aduanas.config;

import com.aduanas.sistema_aduanas.UsuariosFalsos;
import com.aduanas.sistema_aduanas.model.Usuario;
import com.aduanas.sistema_aduanas.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas de la carga inicial de usuarios (sin Spring ni base de datos).
class UsuariosInicialesTest {

    private Map<String, Usuario> tabla;
    private UsuariosIniciales cargador;

    @BeforeEach
    void preparar() {
        tabla = new HashMap<>();
        cargador = new UsuariosIniciales(UsuariosFalsos.repositorio(tabla), "ClaveAdmin1*", "ClaveFunc1*");
    }

    @Test
    void creaLosDosUsuariosIniciales() {
        cargador.run();

        assertEquals(2, tabla.size());
        assertEquals(AuthService.ROL_ADMIN, tabla.get("admin").getRol());
        assertEquals(AuthService.ROL_FUNCIONARIO, tabla.get("funcionario").getRol());
    }

    @Test
    void lasContrasenasQuedanConHashYSePuedenVerificar() {
        cargador.run();

        Usuario admin = tabla.get("admin");
        assertFalse(admin.getClaveHash().contains("ClaveAdmin1*"));
        assertTrue(AuthService.verificar("ClaveAdmin1*", admin.getClaveHash()));
    }

    @Test
    void siSeEjecutaDosVecesNoDuplicaNiPisaLosUsuarios() {
        cargador.run();
        String hashOriginal = tabla.get("admin").getClaveHash();

        cargador.run();

        assertEquals(2, tabla.size());
        assertEquals(hashOriginal, tabla.get("admin").getClaveHash());
    }

    @Test
    void noPisaUnaContrasenaQueYaFueCambiada() {
        tabla.put("admin", new Usuario("admin", "Administrador", AuthService.ROL_ADMIN, AuthService.hashear("Nueva*")));

        cargador.run();

        assertTrue(AuthService.verificar("Nueva*", tabla.get("admin").getClaveHash()));
        assertTrue(tabla.containsKey("funcionario"));
    }
}

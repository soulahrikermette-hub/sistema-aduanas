package com.aduanas.sistema_aduanas.controller;

import com.aduanas.sistema_aduanas.exception.CredencialesInvalidasException;
import com.aduanas.sistema_aduanas.UsuariosFalsos;
import com.aduanas.sistema_aduanas.model.LoginRequest;
import com.aduanas.sistema_aduanas.model.LoginRespuesta;
import com.aduanas.sistema_aduanas.model.Usuario;
import com.aduanas.sistema_aduanas.service.AuthService;
import com.aduanas.sistema_aduanas.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas del controlador de sesión sin levantar Spring.
class AuthControllerTest {

    private static final String SECRETO = "una-clave-secreta-de-prueba-con-mas-de-32-caracteres";

    private JwtService jwt;
    private AuthController controlador;

    @BeforeEach
    void preparar() {
        Map<String, Usuario> tabla = new HashMap<>();
        tabla.put("admin", new Usuario("admin", "Administrador", AuthService.ROL_ADMIN, AuthService.hashear("ClaveAdmin1*")));
        jwt = new JwtService(SECRETO, 8);
        controlador = new AuthController(new AuthService(UsuariosFalsos.repositorio(tabla), jwt));
    }

    @Test
    void elLoginCorrectoDevuelveElUsuarioElTokenYUnaCookieHttpOnly() {
        ResponseEntity<LoginRespuesta> r = controlador.iniciarSesion(new LoginRequest("admin", "ClaveAdmin1*"));

        assertEquals(200, r.getStatusCode().value());
        assertEquals("ADMIN", r.getBody().rol());
        assertEquals("Bearer", r.getBody().tipo());
        assertTrue(jwt.validar(r.getBody().token()).isPresent());

        String cookie = r.getHeaders().getFirst("Set-Cookie");
        assertTrue(cookie.startsWith("SESION=" + r.getBody().token()));
        assertTrue(cookie.contains("HttpOnly"));
        assertTrue(cookie.contains("SameSite=Lax"));
        assertTrue(cookie.contains("Max-Age=28800"));
    }

    @Test
    void laRespuestaNuncaIncluyeLaContrasena() {
        LoginRespuesta r = controlador.iniciarSesion(new LoginRequest("admin", "ClaveAdmin1*")).getBody();

        assertFalse(r.toString().contains("ClaveAdmin1*"));
    }

    @Test
    void elLoginIncorrectoLanzaCredencialesInvalidas() {
        assertThrows(CredencialesInvalidasException.class,
                () -> controlador.iniciarSesion(new LoginRequest("admin", "mal")));
    }

    @Test
    void cerrarSesionResponde204YBorraLaCookie() {
        ResponseEntity<Void> r = controlador.cerrarSesion();

        assertEquals(204, r.getStatusCode().value());
        String cookie = r.getHeaders().getFirst("Set-Cookie");
        assertTrue(cookie.startsWith("SESION=;"));
        assertTrue(cookie.contains("Max-Age=0"));
    }
}

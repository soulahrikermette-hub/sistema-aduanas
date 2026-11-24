package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.UsuariosFalsos;
import com.aduanas.sistema_aduanas.exception.CredencialesInvalidasException;
import com.aduanas.sistema_aduanas.model.Usuario;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas del inicio de sesión. No necesitan Spring ni base de datos:
// el repositorio se reemplaza por uno falso que guarda los usuarios en un mapa.
class AuthServiceTest {

    private static final String SECRETO = "una-clave-secreta-de-prueba-con-mas-de-32-caracteres";

    private Map<String, Usuario> tabla;
    private JwtService jwt;
    private AuthService auth;

    @BeforeEach
    void preparar() {
        tabla = new HashMap<>();
        tabla.put("admin", new Usuario("admin", "Administrador", AuthService.ROL_ADMIN, AuthService.hashear("ClaveAdmin1*")));
        tabla.put("funcionario", new Usuario("funcionario", "Funcionario de aduanas", AuthService.ROL_FUNCIONARIO,
                AuthService.hashear("ClaveFunc1*")));
        jwt = new JwtService(SECRETO, 8);
        auth = new AuthService(UsuariosFalsos.repositorio(tabla), jwt);
    }

    @Test
    void conCredencialesCorrectasSeEntregaUnTokenValido() {
        AuthService.Autenticacion r = auth.iniciarSesion("admin", "ClaveAdmin1*");

        JwtService.Claims datos = jwt.validar(r.token()).orElseThrow();
        assertEquals("admin", datos.usuario());
        assertEquals(AuthService.ROL_ADMIN, datos.rol());
        assertEquals("Administrador", r.sesion().nombre());
        assertEquals(8 * 3600L, r.expiraEnSegundos());
    }

    @Test
    void elRolDelFuncionarioViajaEnElToken() {
        AuthService.Autenticacion r = auth.iniciarSesion("funcionario", "ClaveFunc1*");

        assertEquals(AuthService.ROL_FUNCIONARIO, jwt.validar(r.token()).orElseThrow().rol());
    }

    @Test
    void elUsuarioNoDistingueMayusculasNiEspacios() {
        assertEquals("funcionario", auth.iniciarSesion("  Funcionario ", "ClaveFunc1*").sesion().usuario());
    }

    @Test
    void conContrasenaIncorrectaSeRechaza() {
        CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                () -> auth.iniciarSesion("admin", "otra"));
        assertFalse(ex.isBloqueado());
    }

    @Test
    void conUsuarioInexistenteDaElMismoMensajeQueConClaveIncorrecta() {
        CredencialesInvalidasException a = assertThrows(CredencialesInvalidasException.class,
                () -> auth.iniciarSesion("fantasma", "x"));
        CredencialesInvalidasException b = assertThrows(CredencialesInvalidasException.class,
                () -> auth.iniciarSesion("admin", "x"));
        assertEquals(a.getMessage(), b.getMessage());
    }

    @Test
    void usuarioOClaveNulosSeRechazanSinFallar() {
        assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion(null, null));
        assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", null));
    }

    @Test
    void tras5FallosLaCuentaSeBloqueaAunqueLaClaveSeaCorrecta() {
        for (int i = 0; i < 5; i++) {
            assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", "mal"));
        }
        CredencialesInvalidasException ex = assertThrows(CredencialesInvalidasException.class,
                () -> auth.iniciarSesion("admin", "ClaveAdmin1*"));
        assertTrue(ex.isBloqueado());
    }

    @Test
    void elBloqueoDeUnaCuentaNoAfectaALasDemas() {
        for (int i = 0; i < 5; i++) {
            assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", "mal"));
        }
        assertNotNull(auth.iniciarSesion("funcionario", "ClaveFunc1*"));
    }

    @Test
    void elBloqueoTerminaAlPasarUnMinuto() {
        Instant inicio = Instant.parse("2026-10-13T10:00:00Z");
        auth.usarReloj(Clock.fixed(inicio, ZoneOffset.UTC));
        for (int i = 0; i < 5; i++) {
            assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", "mal"));
        }
        auth.usarReloj(Clock.fixed(inicio.plusSeconds(61), ZoneOffset.UTC));

        assertNotNull(auth.iniciarSesion("admin", "ClaveAdmin1*"));
    }

    @Test
    void unInicioCorrectoReiniciaElContadorDeFallos() {
        for (int i = 0; i < 4; i++) {
            assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", "mal"));
        }
        assertNotNull(auth.iniciarSesion("admin", "ClaveAdmin1*"));
        for (int i = 0; i < 4; i++) {
            assertThrows(CredencialesInvalidasException.class, () -> auth.iniciarSesion("admin", "mal"));
        }
        // Siguen sin bloquearse: el contador se había reiniciado
        assertNotNull(auth.iniciarSesion("admin", "ClaveAdmin1*"));
    }

    @Test
    void laContrasenaSeGuardaConHashYNuncaEnTextoPlano() {
        String hash = AuthService.hashear("MiClave123*");

        assertTrue(hash.startsWith("pbkdf2$120000$"));
        assertFalse(hash.contains("MiClave123*"));
    }

    @Test
    void elMismoTextoDaHashesDistintosPorLaSal() {
        assertNotEquals(AuthService.hashear("igual"), AuthService.hashear("igual"));
    }

    @Test
    void verificarAceptaLaClaveCorrectaYRechazaLasDemas() {
        String hash = AuthService.hashear("Correcta1*");

        assertTrue(AuthService.verificar("Correcta1*", hash));
        assertFalse(AuthService.verificar("correcta1*", hash));
        assertFalse(AuthService.verificar("", hash));
    }

    @Test
    void verificarRechazaHashesMalFormados() {
        assertFalse(AuthService.verificar("x", "no-es-un-hash"));
        assertFalse(AuthService.verificar("x", "pbkdf2$abc$sal$hash"));
        assertFalse(AuthService.verificar("x", "md5$1$a$b"));
    }

    @Test
    void cadaInicioDeSesionGeneraUnTokenValido() {
        String t1 = auth.iniciarSesion("admin", "ClaveAdmin1*").token();
        String t2 = auth.iniciarSesion("admin", "ClaveAdmin1*").token();

        assertTrue(jwt.validar(t1).isPresent());
        assertTrue(jwt.validar(t2).isPresent());
    }
}

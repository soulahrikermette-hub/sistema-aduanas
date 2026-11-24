package com.aduanas.sistema_aduanas.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

// Pruebas del JWT (no necesitan Spring ni base de datos).
class JwtServiceTest {

    private static final String SECRETO = "una-clave-secreta-de-prueba-con-mas-de-32-caracteres";
    private static final Instant INICIO = Instant.parse("2026-10-13T10:00:00Z");

    private JwtService jwt;

    @BeforeEach
    void preparar() {
        jwt = new JwtService(SECRETO, 8);
        jwt.usarReloj(Clock.fixed(INICIO, ZoneOffset.UTC));
    }

    private static String b64(String texto) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(texto.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void unTokenRecienCreadoSeValidaYTraeSusDatos() {
        String token = jwt.generar("admin", "Administrador", "ADMIN");

        JwtService.Claims datos = jwt.validar(token).orElseThrow();
        assertEquals("admin", datos.usuario());
        assertEquals("Administrador", datos.nombre());
        assertEquals("ADMIN", datos.rol());
        assertEquals(INICIO.plusSeconds(8 * 3600), datos.expira());
    }

    @Test
    void elTokenTieneTresPartesSeparadasPorPuntos() {
        assertEquals(3, jwt.generar("admin", "Administrador", "ADMIN").split("\\.").length);
    }

    @Test
    void laCabeceraDeclaraHS256() {
        String cabecera = new String(Base64.getUrlDecoder().decode(jwt.generar("a", "b", "ADMIN").split("\\.")[0]),
                StandardCharsets.UTF_8);
        assertEquals("{\"alg\":\"HS256\",\"typ\":\"JWT\"}", cabecera);
    }

    @Test
    void nombresConTildesComillasYBarrasSeConservan() {
        String nombre = "Ñandú \"Jefe\" \\ de aduanas\tÁ";
        String token = jwt.generar("jefe", nombre, "ADMIN");

        assertEquals(nombre, jwt.validar(token).orElseThrow().nombre());
    }

    @Test
    void siSeCambiaUnCaracterDeLaFirmaSeRechaza() {
        String token = jwt.generar("admin", "Administrador", "ADMIN");
        char ultimo = token.charAt(token.length() - 1);
        String alterado = token.substring(0, token.length() - 1) + (ultimo == 'A' ? 'B' : 'A');

        assertTrue(jwt.validar(alterado).isEmpty());
    }

    @Test
    void siSeCambianLosDatosConLaMismaFirmaSeRechaza() {
        // Un funcionario intenta convertirse en ADMIN editando el token
        String token = jwt.generar("funcionario", "Funcionario", "FUNCIONARIO");
        String[] partes = token.split("\\.");
        String datosFalsos = b64("{\"sub\":\"funcionario\",\"nom\":\"Funcionario\",\"rol\":\"ADMIN\",\"iat\":1,\"exp\":9999999999}");

        assertTrue(jwt.validar(partes[0] + "." + datosFalsos + "." + partes[2]).isEmpty());
    }

    @Test
    void unTokenFirmadoConOtraClaveSeRechaza() {
        JwtService otro = new JwtService("otra-clave-secreta-distinta-de-mas-de-32-caracteres", 8);
        otro.usarReloj(Clock.fixed(INICIO, ZoneOffset.UTC));

        assertTrue(jwt.validar(otro.generar("admin", "Administrador", "ADMIN")).isEmpty());
    }

    @Test
    void elTokenVenceConElTiempo() {
        String token = jwt.generar("admin", "Administrador", "ADMIN");

        jwt.usarReloj(Clock.fixed(INICIO.plusSeconds(8 * 3600 - 1), ZoneOffset.UTC));
        assertTrue(jwt.validar(token).isPresent());

        jwt.usarReloj(Clock.fixed(INICIO.plusSeconds(8 * 3600), ZoneOffset.UTC));
        assertTrue(jwt.validar(token).isEmpty());
    }

    @Test
    void elAtaqueDelAlgoritmoNoneSeRechaza() {
        String cabecera = b64("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        String datos = b64("{\"sub\":\"admin\",\"nom\":\"Administrador\",\"rol\":\"ADMIN\",\"iat\":1,\"exp\":9999999999}");

        assertTrue(jwt.validar(cabecera + "." + datos + ".").isEmpty());
    }

    @Test
    void textosNulosVaciosOInventadosNoValen() {
        assertTrue(jwt.validar(null).isEmpty());
        assertTrue(jwt.validar("").isEmpty());
        assertTrue(jwt.validar("   ").isEmpty());
        assertTrue(jwt.validar("inventado").isEmpty());
        assertTrue(jwt.validar("a.b.c").isEmpty());
        assertTrue(jwt.validar("a.b.c.d").isEmpty());
        assertTrue(jwt.validar("....").isEmpty());
    }

    @Test
    void unSecretoCortoSeRechazaAlArrancar() {
        assertThrows(IllegalStateException.class, () -> new JwtService("corto", 8));
    }

    @Test
    void sinSecretoSeUsaUnaClaveAleatoriaPorInstancia() {
        JwtService a = new JwtService("", 8);
        JwtService b = new JwtService("", 8);

        String token = a.generar("admin", "Administrador", "ADMIN");
        assertTrue(a.validar(token).isPresent());
        assertTrue(b.validar(token).isEmpty());
    }

    @Test
    void laDuracionSaleDeLasHorasConfiguradas() {
        assertEquals(2 * 3600L, new JwtService(SECRETO, 2).duracionSegundos());
    }

    @Test
    void elLectorDeJsonAceptaObjetosPlanos() {
        Map<String, String> r = JwtService.leerJsonPlano(" { \"a\" : \"x\\\"y\" , \"n\": -12 } ");

        assertNotNull(r);
        assertEquals("x\"y", r.get("a"));
        assertEquals("-12", r.get("n"));
        assertEquals(0, JwtService.leerJsonPlano("{}").size());
    }

    @Test
    void elLectorDeJsonRechazaLoMalFormado() {
        assertNull(JwtService.leerJsonPlano(""));
        assertNull(JwtService.leerJsonPlano("[]"));
        assertNull(JwtService.leerJsonPlano("{\"a\":}"));
        assertNull(JwtService.leerJsonPlano("{\"a\":\"sin cierre}"));
        assertNull(JwtService.leerJsonPlano("{\"a\":1,}"));
        assertNull(JwtService.leerJsonPlano("{\"a\":1} basura"));
        assertNull(JwtService.leerJsonPlano("{\"a\":\"\\q\"}"));
    }

    @Test
    void unTokenConExpNoNumericoSeRechaza() {
        // Aunque estuviera bien firmado, un "exp" ilegible no puede dar acceso
        Optional<JwtService.Claims> r = jwt.validar("x.y.z");
        assertTrue(r.isEmpty());
    }
}

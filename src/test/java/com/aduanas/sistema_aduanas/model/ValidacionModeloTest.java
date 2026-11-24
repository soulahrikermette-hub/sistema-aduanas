package com.aduanas.sistema_aduanas.model;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Comprueba las reglas de validación (@NotBlank, @Pattern, @Positive...) sin levantar Spring.
// Estas son las reglas que hacen que la API responda 400 cuando llegan datos incorrectos.
class ValidacionModeloTest {

    private final Validator validador = Validation.buildDefaultValidatorFactory().getValidator();

    // Declaración correcta, base para las pruebas
    private Declaracion declaracionValida() {
        Declaracion d = new Declaracion();
        d.setNumeroDeclaracion("DUA-2026-00123");
        d.setTipoOperacion("IMPORTACION");
        d.setFecha("2026-09-06");
        d.setAduana("Aduana de Paita");
        d.setImportadorExportador("Comercial Andina SAC");
        return d;
    }

    // Mercancía correcta, base para las pruebas
    private Mercancia mercanciaValida() {
        Mercancia m = new Mercancia();
        m.setDeclaracionId(1L);
        m.setDescripcion("Repuestos automotrices");
        m.setPartidaArancelaria("8708.99.00");
        m.setCantidad(120.0);
        m.setUnidadMedida("unidades");
        m.setValor(4300.0);
        return m;
    }

    // Devuelve los nombres de los campos que fallaron
    private Set<String> camposInvalidos(Object objeto) {
        return validador.validate(objeto).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }

    @Test
    void unaDeclaracionCorrectaNoTieneErrores() {
        assertTrue(validador.validate(declaracionValida()).isEmpty());
    }

    @Test
    void unaDeclaracionVaciaFallaEnLosCamposObligatorios() {
        Set<String> campos = camposInvalidos(new Declaracion());

        assertTrue(campos.containsAll(Set.of(
                "numeroDeclaracion", "tipoOperacion", "fecha", "aduana", "importadorExportador")));
    }

    @Test
    void rechazaUnTipoDeOperacionDesconocido() {
        Declaracion d = declaracionValida();
        d.setTipoOperacion("TRANSITO");

        assertEquals(Set.of("tipoOperacion"), camposInvalidos(d));
    }

    @Test
    void rechazaFechasConFormatoIncorrecto() {
        for (String fecha : new String[]{"06/09/2026", "2026-13-01", "2026-00-10", "2026-09-32", "hoy"}) {
            Declaracion d = declaracionValida();
            d.setFecha(fecha);
            assertEquals(Set.of("fecha"), camposInvalidos(d), "Debería rechazar la fecha " + fecha);
        }
    }

    @Test
    void rechazaUnEstadoDesconocido() {
        Declaracion d = declaracionValida();
        d.setEstado("TERMINADA");

        assertEquals(Set.of("estado"), camposInvalidos(d));
    }

    @Test
    void aceptaTodosLosEstadosValidos() {
        for (String estado : new String[]{"PENDIENTE", "EN_REVISION", "APROBADA", "RECHAZADA"}) {
            Declaracion d = declaracionValida();
            d.setEstado(estado);
            assertTrue(validador.validate(d).isEmpty(), "Debería aceptar " + estado);
        }
    }

    @Test
    void unaMercanciaCorrectaNoTieneErrores() {
        assertTrue(validador.validate(mercanciaValida()).isEmpty());
    }

    @Test
    void laMercanciaDebeTenerDeclaracionAsociada() {
        Mercancia m = mercanciaValida();
        m.setDeclaracionId(null);

        assertEquals(Set.of("declaracionId"), camposInvalidos(m));
    }

    @Test
    void rechazaPartidasArancelariasConFormatoIncorrecto() {
        for (String partida : new String[]{"8708", "87089900", "8708-99-00", "ABCD.EF.GH"}) {
            Mercancia m = mercanciaValida();
            m.setPartidaArancelaria(partida);
            assertEquals(Set.of("partidaArancelaria"), camposInvalidos(m), "Debería rechazar " + partida);
        }
    }

    @Test
    void aceptaPartidasConDosOCincoGrupos() {
        for (String partida : new String[]{"8708.99.00", "8708.99.00.00"}) {
            Mercancia m = mercanciaValida();
            m.setPartidaArancelaria(partida);
            assertTrue(validador.validate(m).isEmpty(), "Debería aceptar " + partida);
        }
    }

    @Test
    void rechazaCantidadesYValoresCeroONegativos() {
        Mercancia m = mercanciaValida();
        m.setCantidad(0.0);
        m.setValor(-5.0);

        assertEquals(Set.of("cantidad", "valor"), camposInvalidos(m));
    }

    @Test
    void elPesoEsOpcionalPeroNoPuedeSerNegativo() {
        Mercancia sinPeso = mercanciaValida();
        assertTrue(validador.validate(sinPeso).isEmpty());

        Mercancia pesoNegativo = mercanciaValida();
        pesoNegativo.setPeso(-1.0);
        assertEquals(Set.of("peso"), camposInvalidos(pesoNegativo));
    }

    @Test
    void elRequestDeEstadoValidaElValor() {
        assertTrue(validador.validate(new EstadoRequest("APROBADA")).isEmpty());
        assertEquals(Set.of("estado"), camposInvalidos(new EstadoRequest("XYZ")));
        assertEquals(Set.of("estado"), camposInvalidos(new EstadoRequest("")));
    }
    // Incidencia correcta, base para las pruebas
    private Incidencia incidenciaValida() {
        Incidencia i = new Incidencia();
        i.setMercanciaId(1L);
        i.setTipo("ROBO");
        i.setFecha("2026-10-30");
        i.setDescripcion("Se encontró el precinto roto y faltan cajas");
        return i;
    }

    @Test
    void laIncidenciaValidaNoTieneErrores() {
        assertTrue(validador.validate(incidenciaValida()).isEmpty());
    }

    @Test
    void rechazaIncidenciaConTipoFechaOCantidadIncorrectos() {
        Incidencia i = incidenciaValida();
        i.setTipo("INCENDIO");          // solo PERDIDA, EXTRAVIO, ROBO o DANO
        i.setFecha("30/10/2026");       // el formato debe ser AAAA-MM-DD
        i.setCantidadAfectada(0.0);     // si se indica, debe ser mayor a 0

        assertEquals(Set.of("tipo", "fecha", "cantidadAfectada"), camposInvalidos(i));
    }

    @Test
    void laIncidenciaExigeMercanciaYDescripcion() {
        Incidencia i = incidenciaValida();
        i.setMercanciaId(null);
        i.setDescripcion("  ");

        assertEquals(Set.of("mercanciaId", "descripcion"), camposInvalidos(i));
    }

    @Test
    void elRequestDeEstadoDeIncidenciaValidaElValor() {
        assertTrue(validador.validate(new EstadoIncidenciaRequest("RESUELTA")).isEmpty());
        assertEquals(Set.of("estado"), camposInvalidos(new EstadoIncidenciaRequest("CERRADA")));
    }
}

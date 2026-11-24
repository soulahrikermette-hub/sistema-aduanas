package com.aduanas.sistema_aduanas.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

// Crea y valida tokens JWT (JSON Web Token, RFC 7519) firmados con HMAC-SHA256 (algoritmo HS256).
//
// Un JWT son tres partes en Base64URL separadas por puntos:  cabecera.datos.firma
//   - cabecera: {"alg":"HS256","typ":"JWT"}
//   - datos (claims): usuario (sub), nombre (nom), rol (rol), emitido (iat) y vence (exp)
//   - firma: HMAC-SHA256 de "cabecera.datos" con la clave secreta del servidor
// Si alguien cambia un solo carácter de los datos, la firma deja de coincidir y el token se rechaza.
// Está hecho a mano (sin librerías extra) para que se vea cómo funciona el estándar.
@Service
public class JwtService {

    // Datos que viajan dentro del token (lo que el servidor necesita saber de quien lo envía)
    public record Claims(String usuario, String nombre, String rol, Instant expira) {
    }

    // Cabecera fija: solo aceptamos HS256 (así se evita el ataque del algoritmo "none")
    private static final String CABECERA = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
    private static final int LARGO_MINIMO_SECRETO = 32;

    private final byte[] clave;
    private final long duracionSegundos;
    private Clock reloj = Clock.systemUTC();

    // El secreto sale de application.properties (aduanas.jwt.secreto). Si se deja vacío se genera
    // uno aleatorio al arrancar: la app funciona igual, pero las sesiones se pierden al reiniciar.
    public JwtService(@Value("${aduanas.jwt.secreto:}") String secreto,
                      @Value("${aduanas.jwt.horas:8}") long horas) {
        if (secreto == null || secreto.isBlank()) {
            byte[] azar = new byte[64];
            new SecureRandom().nextBytes(azar);
            this.clave = azar;
            System.getLogger(JwtService.class.getName()).log(System.Logger.Level.WARNING,
                    "aduanas.jwt.secreto está vacío: se usa una clave aleatoria y las sesiones no sobrevivirán a un reinicio.");
        } else if (secreto.length() < LARGO_MINIMO_SECRETO) {
            throw new IllegalStateException("aduanas.jwt.secreto debe tener al menos " + LARGO_MINIMO_SECRETO + " caracteres.");
        } else {
            this.clave = secreto.getBytes(StandardCharsets.UTF_8);
        }
        this.duracionSegundos = horas * 60 * 60;
    }

    // Solo para pruebas: permite "adelantar el reloj" y comprobar que los tokens vencen
    void usarReloj(Clock nuevo) {
        this.reloj = nuevo;
    }

    // Cuánto dura un token, en segundos
    public long duracionSegundos() {
        return duracionSegundos;
    }

    // Crea un token nuevo para el usuario indicado
    public String generar(String usuario, String nombre, String rol) {
        long emitido = reloj.instant().getEpochSecond();
        long vence = emitido + duracionSegundos;
        String datos = "{\"sub\":" + texto(usuario) + ",\"nom\":" + texto(nombre) + ",\"rol\":" + texto(rol)
                + ",\"iat\":" + emitido + ",\"exp\":" + vence + "}";
        String cuerpo = codificar(CABECERA) + "." + codificar(datos);
        return cuerpo + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(firmar(cuerpo));
    }

    // Comprueba la firma y la fecha de vencimiento. Devuelve los datos del token,
    // o vacío si el token es inválido, fue alterado o ya venció.
    public Optional<Claims> validar(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String[] partes = token.split("\\.", -1);
        if (partes.length != 3) {
            return Optional.empty();
        }
        try {
            // 1) La cabecera tiene que ser exactamente la esperada (HS256)
            if (!CABECERA.equals(decodificar(partes[0]))) {
                return Optional.empty();
            }
            // 2) La firma tiene que coincidir (comparación en tiempo constante)
            byte[] esperada = firmar(partes[0] + "." + partes[1]);
            byte[] recibida = Base64.getUrlDecoder().decode(partes[2]);
            if (!MessageDigest.isEqual(esperada, recibida)) {
                return Optional.empty();
            }
            // 3) Leer los datos y comprobar que no haya vencido
            Map<String, String> datos = leerJsonPlano(decodificar(partes[1]));
            if (datos == null) {
                return Optional.empty();
            }
            String usuario = datos.get("sub");
            String nombre = datos.get("nom");
            String rol = datos.get("rol");
            String vence = datos.get("exp");
            if (usuario == null || nombre == null || rol == null || vence == null) {
                return Optional.empty();
            }
            Instant expira = Instant.ofEpochSecond(Long.parseLong(vence));
            if (!reloj.instant().isBefore(expira)) {
                return Optional.empty();
            }
            return Optional.of(new Claims(usuario, nombre, rol, expira));
        } catch (IllegalArgumentException | java.time.DateTimeException e) {
            // Base64 mal formado o número ilegible: el token no sirve
            return Optional.empty();
        }
    }

    // HMAC-SHA256 del texto con la clave secreta
    private byte[] firmar(String texto) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(clave, "HmacSHA256"));
            return mac.doFinal(texto.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo firmar el token", e);
        }
    }

    private static String codificar(String texto) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(texto.getBytes(StandardCharsets.UTF_8));
    }

    private static String decodificar(String base64) {
        return new String(Base64.getUrlDecoder().decode(base64), StandardCharsets.UTF_8);
    }

    // Convierte un texto a literal JSON (con comillas), escapando lo que haga falta
    private static String texto(String valor) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : valor.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    // Lector mínimo de un objeto JSON "plano" (solo textos y números, sin anidar), que es lo único
    // que contiene nuestro token. Devuelve null si el formato no es válido.
    static Map<String, String> leerJsonPlano(String json) {
        int[] pos = {0};
        Map<String, String> resultado = new HashMap<>();
        saltarEspacios(json, pos);
        if (!consumir(json, pos, '{')) {
            return null;
        }
        saltarEspacios(json, pos);
        if (consumir(json, pos, '}')) {
            return finalizado(json, pos) ? resultado : null;
        }
        while (true) {
            saltarEspacios(json, pos);
            String clave = leerTexto(json, pos);
            if (clave == null) {
                return null;
            }
            saltarEspacios(json, pos);
            if (!consumir(json, pos, ':')) {
                return null;
            }
            saltarEspacios(json, pos);
            String valor;
            if (pos[0] < json.length() && json.charAt(pos[0]) == '"') {
                valor = leerTexto(json, pos);
            } else {
                valor = leerNumero(json, pos);
            }
            if (valor == null) {
                return null;
            }
            resultado.put(clave, valor);
            saltarEspacios(json, pos);
            if (consumir(json, pos, ',')) {
                continue;
            }
            if (consumir(json, pos, '}')) {
                return finalizado(json, pos) ? resultado : null;
            }
            return null;
        }
    }

    private static boolean finalizado(String json, int[] pos) {
        saltarEspacios(json, pos);
        return pos[0] == json.length();
    }

    private static void saltarEspacios(String json, int[] pos) {
        while (pos[0] < json.length() && Character.isWhitespace(json.charAt(pos[0]))) {
            pos[0]++;
        }
    }

    private static boolean consumir(String json, int[] pos, char esperado) {
        if (pos[0] < json.length() && json.charAt(pos[0]) == esperado) {
            pos[0]++;
            return true;
        }
        return false;
    }

    // Lee un texto entre comillas (con sus escapes). null si está mal formado.
    private static String leerTexto(String json, int[] pos) {
        if (!consumir(json, pos, '"')) {
            return null;
        }
        StringBuilder sb = new StringBuilder();
        while (pos[0] < json.length()) {
            char c = json.charAt(pos[0]++);
            if (c == '"') {
                return sb.toString();
            }
            if (c != '\\') {
                sb.append(c);
                continue;
            }
            if (pos[0] >= json.length()) {
                return null;
            }
            char e = json.charAt(pos[0]++);
            switch (e) {
                case '"', '\\', '/' -> sb.append(e);
                case 'n' -> sb.append('\n');
                case 'r' -> sb.append('\r');
                case 't' -> sb.append('\t');
                case 'b' -> sb.append('\b');
                case 'f' -> sb.append('\f');
                case 'u' -> {
                    if (pos[0] + 4 > json.length()) {
                        return null;
                    }
                    try {
                        sb.append((char) Integer.parseInt(json.substring(pos[0], pos[0] + 4), 16));
                    } catch (NumberFormatException ex) {
                        return null;
                    }
                    pos[0] += 4;
                }
                default -> {
                    return null;
                }
            }
        }
        return null; // faltó la comilla de cierre
    }

    // Lee un número entero (con signo opcional). null si no hay dígitos.
    private static String leerNumero(String json, int[] pos) {
        int inicio = pos[0];
        if (pos[0] < json.length() && json.charAt(pos[0]) == '-') {
            pos[0]++;
        }
        int digitos = 0;
        while (pos[0] < json.length() && Character.isDigit(json.charAt(pos[0]))) {
            pos[0]++;
            digitos++;
        }
        return digitos == 0 ? null : json.substring(inicio, pos[0]);
    }
}

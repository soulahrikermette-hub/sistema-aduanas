package com.aduanas.sistema_aduanas.service;

import com.aduanas.sistema_aduanas.exception.CredencialesInvalidasException;
import com.aduanas.sistema_aduanas.model.SesionRespuesta;
import com.aduanas.sistema_aduanas.model.Usuario;
import com.aduanas.sistema_aduanas.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

// Inicio de sesión:
//  - Los usuarios viven en la tabla "usuarios" de la base de datos.
//  - Sus contraseñas se guardan con PBKDF2 (sal + 120 000 iteraciones), nunca en texto plano.
//  - Al entrar correctamente se entrega un token JWT firmado (ver JwtService).
//  - Tras 5 intentos fallidos seguidos la cuenta se bloquea 1 minuto.
@Service
public class AuthService {

    public static final String ROL_ADMIN = "ADMIN";
    public static final String ROL_FUNCIONARIO = "FUNCIONARIO";

    // Nombre de la cookie en la que viaja el token (HttpOnly: el JavaScript de la página no la puede leer)
    public static final String COOKIE = "SESION";

    private static final int MAX_INTENTOS = 5;
    private static final long BLOQUEO_SEGUNDOS = 60;
    private static final int ITERACIONES = 120_000;
    private static final SecureRandom AZAR = new SecureRandom();

    // Resultado de un inicio de sesión correcto
    public record Autenticacion(String token, SesionRespuesta sesion, long expiraEnSegundos) {
    }

    // Intentos fallidos seguidos de un usuario
    private static final class Intentos {
        int fallos;
        Instant bloqueadoHasta = Instant.EPOCH;
    }

    private final UsuarioRepository usuarios;
    private final JwtService jwt;
    private final Map<String, Intentos> intentos = new ConcurrentHashMap<>();
    private final String hashFicticio;   // para tardar lo mismo cuando el usuario no existe
    private Clock reloj = Clock.systemUTC();

    public AuthService(UsuarioRepository usuarios, JwtService jwt) {
        this.usuarios = usuarios;
        this.jwt = jwt;
        this.hashFicticio = hashear("no-existe");
    }

    // Solo para pruebas: permite "adelantar el reloj" y comprobar que el bloqueo termina
    void usarReloj(Clock nuevo) {
        this.reloj = nuevo;
    }

    // Valida usuario y contraseña. Si son correctos devuelve el token JWT y los datos del usuario.
    public Autenticacion iniciarSesion(String usuario, String clave) {
        String clUsuario = usuario == null ? "" : usuario.trim().toLowerCase();
        Instant ahora = reloj.instant();

        Intentos registro = intentos.computeIfAbsent(clUsuario, k -> new Intentos());
        synchronized (registro) {
            if (ahora.isBefore(registro.bloqueadoHasta)) {
                throw new CredencialesInvalidasException("Demasiados intentos. Espera un minuto e inténtalo de nuevo.", true);
            }
            Optional<Usuario> cuenta = usuarios.findByUsuario(clUsuario);
            // Si el usuario no existe se compara contra un hash falso, para tardar lo mismo
            String hash = cuenta.map(Usuario::getClaveHash).orElse(hashFicticio);
            boolean claveOk = verificar(clave == null ? "" : clave, hash);

            if (cuenta.isEmpty() || !claveOk) {
                registro.fallos++;
                if (registro.fallos >= MAX_INTENTOS) {
                    registro.fallos = 0;
                    registro.bloqueadoHasta = ahora.plusSeconds(BLOQUEO_SEGUNDOS);
                }
                throw new CredencialesInvalidasException("Usuario o contraseña incorrectos.", false);
            }
            registro.fallos = 0;

            Usuario u = cuenta.get();
            String token = jwt.generar(u.getUsuario(), u.getNombre(), u.getRol());
            return new Autenticacion(token, new SesionRespuesta(u.getUsuario(), u.getNombre(), u.getRol()),
                    jwt.duracionSegundos());
        }
    }

    // Convierte una contraseña en su hash seguro, con el formato  pbkdf2$iteraciones$sal$hash
    public static String hashear(String clave) {
        byte[] sal = new byte[16];
        AZAR.nextBytes(sal);
        Base64.Encoder b64 = Base64.getEncoder();
        return "pbkdf2$" + ITERACIONES + "$" + b64.encodeToString(sal) + "$" + b64.encodeToString(derivar(clave, sal, ITERACIONES));
    }

    // Comprueba una contraseña contra un hash guardado (comparación en tiempo constante)
    public static boolean verificar(String clave, String almacenado) {
        String[] partes = almacenado.split("\\$");
        if (partes.length != 4 || !"pbkdf2".equals(partes[0])) {
            return false;
        }
        try {
            int iteraciones = Integer.parseInt(partes[1]);
            byte[] sal = Base64.getDecoder().decode(partes[2]);
            byte[] esperado = Base64.getDecoder().decode(partes[3]);
            return MessageDigest.isEqual(esperado, derivar(clave, sal, iteraciones));
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static byte[] derivar(String clave, byte[] sal, int iteraciones) {
        try {
            PBEKeySpec spec = new PBEKeySpec(clave.toCharArray(), sal, iteraciones, 256);
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("No se pudo calcular el hash de la contraseña", e);
        }
    }
}

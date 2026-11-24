package com.aduanas.sistema_aduanas.config;

import com.aduanas.sistema_aduanas.model.SesionRespuesta;
import com.aduanas.sistema_aduanas.service.AuthService;
import com.aduanas.sistema_aduanas.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Filtro de Spring Security que corre en CADA petición: busca el token JWT, lo valida y, si es
// correcto, deja al usuario "autenticado" con su rol. Si no hay token o es inválido no hace nada:
// las reglas de SecurityConfig responderán 401 en las rutas protegidas.
//
// El token se busca en dos sitios (en este orden):
//   1) Cabecera  Authorization: Bearer <token>   (Swagger, Postman)
//   2) Cookie HttpOnly "SESION"                  (la página web)
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest peticion, HttpServletResponse respuesta, FilterChain cadena)
            throws ServletException, IOException {
        String token = leerToken(peticion);
        if (token != null) {
            jwt.validar(token).ifPresent(datos -> {
                SesionRespuesta usuario = new SesionRespuesta(datos.usuario(), datos.nombre(), datos.rol());
                // Spring Security espera los roles con el prefijo ROLE_ (ROLE_ADMIN, ROLE_FUNCIONARIO)
                UsernamePasswordAuthenticationToken autenticacion = new UsernamePasswordAuthenticationToken(
                        usuario, null, List.of(new SimpleGrantedAuthority("ROLE_" + datos.rol())));
                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            });
        }
        cadena.doFilter(peticion, respuesta);
    }

    // Busca el token en la cabecera Authorization y, si no está, en la cookie
    private static String leerToken(HttpServletRequest peticion) {
        String cabecera = peticion.getHeader("Authorization");
        if (cabecera != null && cabecera.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return cabecera.substring(7).trim();
        }
        Cookie[] cookies = peticion.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if (AuthService.COOKIE.equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        return null;
    }
}

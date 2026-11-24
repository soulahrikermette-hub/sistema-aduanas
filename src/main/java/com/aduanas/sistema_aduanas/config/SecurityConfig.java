package com.aduanas.sistema_aduanas.config;

import com.aduanas.sistema_aduanas.service.JwtService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

// Configuración de Spring Security. Reglas:
//   - POST /api/auth/login y /api/auth/logout: públicos (hay que poder entrar).
//   - DELETE en /api/**: solo el rol ADMIN (el FUNCIONARIO recibe 403).
//   - Cualquier otra ruta de /api/**: necesita un JWT válido (si no, 401).
//   - La página (index.html, css, js) y Swagger siguen siendo públicos: lo que se protege son los datos.
// Es "sin estado" (STATELESS): el servidor no guarda sesiones, todo viaja en el token.
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain cadenaDeSeguridad(HttpSecurity http, JwtService jwt) throws Exception {
        http
                // Sin CSRF: la API es JSON y la cookie lleva SameSite=Lax (no se envía desde otros sitios)
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sesion -> sesion.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Apagamos el login por formulario y el básico: usamos solo JWT
                .httpBasic(basico -> basico.disable())
                .formLogin(formulario -> formulario.disable())
                .logout(salida -> salida.disable())
                .authorizeHttpRequests(reglas -> reglas
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/login", "/api/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/**").hasRole("ADMIN")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .exceptionHandling(errores -> errores
                        // Sin token válido -> 401
                        .authenticationEntryPoint((peticion, respuesta, ex) ->
                                ErrorJson.escribir(respuesta, 401, "No autorizado", "Inicia sesión para continuar."))
                        // Con token pero sin permiso (FUNCIONARIO intentando eliminar) -> 403
                        .accessDeniedHandler((peticion, respuesta, ex) ->
                                ErrorJson.escribir(respuesta, 403, "Prohibido", "Solo un administrador puede eliminar registros.")))
                // Nuestro filtro lee el JWT antes de que Spring Security decida
                .addFilterBefore(new JwtAuthFilter(jwt), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    // Spring Boot crearía un usuario de prueba con contraseña aleatoria si no hay un UserDetailsService.
    // Nosotros autenticamos con AuthService + JWT, así que dejamos uno vacío para que no lo cree.
    @Bean
    public UserDetailsService sinUsuariosLocales() {
        return nombre -> {
            throw new UsernameNotFoundException("Los usuarios se validan en AuthService");
        };
    }
}

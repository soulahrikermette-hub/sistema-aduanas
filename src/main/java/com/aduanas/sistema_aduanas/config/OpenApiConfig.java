package com.aduanas.sistema_aduanas.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Documentación de la API con Swagger (OpenAPI). Se abre en  http://localhost:8080/swagger-ui.html
// Para probar las rutas protegidas: 1) ejecuta POST /api/auth/login, 2) copia el "token" de la respuesta,
// 3) pulsa el botón "Authorize" y pégalo.
@Configuration
public class OpenApiConfig {

    private static final String ESQUEMA = "bearerAuth";

    @Bean
    public OpenAPI documentacionApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("API del Sistema de Gestión Aduanera")
                        .version("1.0")
                        .description("Declaraciones aduaneras y sus mercancías. Seguridad con JWT: "
                                + "inicia sesión en /api/auth/login y usa el token en el botón Authorize."))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA))
                .components(new Components().addSecuritySchemes(ESQUEMA,
                        new SecurityScheme()
                                .name(ESQUEMA)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}

# ---- Etapa 1: compilar el .jar con Maven (el Angular ya está compilado dentro de src/main/resources/static) ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q dependency:go-offline
COPY src src
RUN ./mvnw -q package -DskipTests

# ---- Etapa 2: imagen liviana solo con el JRE ----
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Memoria acotada para planes gratuitos (512 MB)
ENTRYPOINT ["java", "-Xmx300m", "-jar", "app.jar"]

package uz.logicalcontrol.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class LogicalControlBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(LogicalControlBackendApplication.class, args);
	}

}

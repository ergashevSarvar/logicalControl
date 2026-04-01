package uz.logicalcontrol.backend.classifier;

import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClassifierCacheConfiguration {

    public static final String DEPARTMENTS_CACHE = "classifierDepartments";
    public static final String PROCESS_STAGES_CACHE = "classifierProcessStages";
    public static final String SYSTEM_TYPES_CACHE = "classifierSystemTypes";

    @Bean
    public CacheManager cacheManager() {
        var cacheManager = new ConcurrentMapCacheManager(DEPARTMENTS_CACHE, PROCESS_STAGES_CACHE, SYSTEM_TYPES_CACHE);
        cacheManager.setAllowNullValues(false);
        return cacheManager;
    }
}

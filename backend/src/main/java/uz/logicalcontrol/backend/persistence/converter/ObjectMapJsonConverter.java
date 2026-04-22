package uz.logicalcontrol.backend.persistence.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.Converter;
import java.util.LinkedHashMap;
import java.util.Map;

@Converter
public class ObjectMapJsonConverter extends AbstractJsonAttributeConverter<Map<String, Object>> {

    private static final TypeReference<Map<String, Object>> TYPE_REFERENCE = new TypeReference<>() {
    };

    @Override
    protected TypeReference<Map<String, Object>> typeReference() {
        return TYPE_REFERENCE;
    }

    @Override
    protected Map<String, Object> emptyValue() {
        return new LinkedHashMap<>();
    }
}

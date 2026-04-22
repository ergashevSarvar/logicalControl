package uz.logicalcontrol.backend.persistence.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.Converter;
import java.util.LinkedHashMap;
import java.util.Map;

@Converter
public class StringMapJsonConverter extends AbstractJsonAttributeConverter<Map<String, String>> {

    private static final TypeReference<Map<String, String>> TYPE_REFERENCE = new TypeReference<>() {
    };

    @Override
    protected TypeReference<Map<String, String>> typeReference() {
        return TYPE_REFERENCE;
    }

    @Override
    protected Map<String, String> emptyValue() {
        return new LinkedHashMap<>();
    }
}

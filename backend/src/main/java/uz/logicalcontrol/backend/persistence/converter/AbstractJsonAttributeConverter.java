package uz.logicalcontrol.backend.persistence.converter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;

public abstract class AbstractJsonAttributeConverter<T> implements AttributeConverter<T, String> {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
        .findAndRegisterModules()
        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    protected abstract TypeReference<T> typeReference();

    protected abstract T emptyValue();

    @Override
    public String convertToDatabaseColumn(T attribute) {
        try {
            return OBJECT_MAPPER.writeValueAsString(attribute == null ? emptyValue() : attribute);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("JSON ko'rinishiga o'tkazib bo'lmadi", exception);
        }
    }

    @Override
    public T convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return emptyValue();
        }

        try {
            return OBJECT_MAPPER.readValue(dbData, typeReference());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("JSON qiymatini o'qib bo'lmadi", exception);
        }
    }
}

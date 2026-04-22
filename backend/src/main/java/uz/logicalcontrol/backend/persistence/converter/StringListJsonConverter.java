package uz.logicalcontrol.backend.persistence.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import jakarta.persistence.Converter;
import java.util.ArrayList;
import java.util.List;

@Converter
public class StringListJsonConverter extends AbstractJsonAttributeConverter<List<String>> {

    private static final TypeReference<List<String>> TYPE_REFERENCE = new TypeReference<>() {
    };

    @Override
    protected TypeReference<List<String>> typeReference() {
        return TYPE_REFERENCE;
    }

    @Override
    protected List<String> emptyValue() {
        return new ArrayList<>();
    }
}

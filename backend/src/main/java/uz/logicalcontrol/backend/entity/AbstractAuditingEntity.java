package uz.logicalcontrol.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import java.io.Serializable;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Getter
@Setter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class AbstractAuditingEntity implements Serializable {

    @CreatedBy
    @Column(name = "insuser", length = 50, updatable = false)
    private String insUser;

    @LastModifiedBy
    @Column(name = "upduser", length = 50)
    private String updUser;

    @CreatedDate
    @Column(name = "instime", nullable = false, updatable = false)
    private Instant insTime;

    @LastModifiedDate
    @Column(name = "updtime")
    private Instant updTime;

    @Column(name = "deltime")
    private Instant delTime;

    @Column(name = "isdeleted", nullable = false)
    private int isDeleted = 0;

    public Instant getCreatedAt() {
        return insTime;
    }

    public Instant getUpdatedAt() {
        return updTime;
    }

    public int isDeleted() {
        return isDeleted;
    }

    public void setDeleted(int deleted) {
        isDeleted = deleted;
    }

    public void markDeleted() {
        isDeleted = 1;
        if (delTime == null) {
            delTime = Instant.now();
        }
    }

    @PrePersist
    @PreUpdate
    protected void syncDeletionAuditFields() {
        if (insTime == null) {
            insTime = Instant.now();
        }

        if (isDeleted != 0) {
            if (delTime == null) {
                delTime = Instant.now();
            }
        } else {
            delTime = null;
        }
    }
}

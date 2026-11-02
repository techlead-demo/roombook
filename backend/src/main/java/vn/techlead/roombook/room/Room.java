package vn.techlead.roombook.room;

import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(nullable = false)
    private int capacity;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "room_equipment", joinColumns = @JoinColumn(name = "room_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "equipment", nullable = false, length = 30)
    private Set<Equipment> equipment = new HashSet<>();

    @Column(nullable = false)
    private boolean active;

    protected Room() {
    }

    /** A new room starts in service. */
    public Room(String name, int capacity, Set<Equipment> equipment) {
        this.name = name;
        this.capacity = capacity;
        this.equipment = new HashSet<>(equipment);
        this.active = true;
    }

    /** Changes name, capacity and equipment; never the status (RMB-4 A-5). */
    public void update(String name, int capacity, Set<Equipment> equipment) {
        this.name = name;
        this.capacity = capacity;
        this.equipment.clear();
        this.equipment.addAll(equipment);
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getCapacity() {
        return capacity;
    }

    public Set<Equipment> getEquipment() {
        return Set.copyOf(equipment);
    }

    public boolean isActive() {
        return active;
    }
}

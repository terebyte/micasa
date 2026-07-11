// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package data

import "gorm.io/gorm"

func (s *Store) ListRooms(includeDeleted bool) ([]Room, error) {
	return listQuery[Room](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Order(ColFloor + " asc, " + ColName + " asc, " + ColID + " desc")
	})
}

func (s *Store) GetRoom(id string) (Room, error) {
	return getByID[Room](s, id, identity)
}

func (s *Store) CreateRoom(item *Room) error {
	return s.db.Create(item).Error
}

func (s *Store) UpdateRoom(item Room) error {
	return s.updateByID(TableRooms, &Room{}, item.ID, item)
}

// DeleteRoom soft-deletes the room and detaches any plan markers pointing
// at it (soft delete is an UPDATE, so the FK's SET NULL never fires).
func (s *Store) DeleteRoom(id string) error {
	return s.Transaction(func(tx *Store) error {
		if err := tx.db.Model(&PlanMarker{}).
			Where(ColRoomID+" = ?", id).
			Update(ColRoomID, nil).Error; err != nil {
			return err
		}
		return tx.softDelete(&Room{}, DeletionEntityRoom, id)
	})
}

func (s *Store) RestoreRoom(id string) error {
	return s.restoreEntity(&Room{}, DeletionEntityRoom, id)
}

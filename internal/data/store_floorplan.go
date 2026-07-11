// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package data

import "gorm.io/gorm"

func (s *Store) ListFloorPlans(includeDeleted bool) ([]FloorPlan, error) {
	return listQuery[FloorPlan](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Order(ColFloor + " asc, " + ColName + " asc, " + ColID + " desc")
	})
}

func (s *Store) GetFloorPlan(id string) (FloorPlan, error) {
	return getByID[FloorPlan](s, id, identity)
}

func (s *Store) CreateFloorPlan(item *FloorPlan) error {
	return s.db.Create(item).Error
}

func (s *Store) UpdateFloorPlan(item FloorPlan) error {
	return s.updateByID(TableFloorPlans, &FloorPlan{}, item.ID, item)
}

// DeleteFloorPlan soft-deletes the plan together with its markers; markers
// are meaningless without their plan.
func (s *Store) DeleteFloorPlan(id string) error {
	return s.Transaction(func(tx *Store) error {
		markers, err := tx.ListPlanMarkers(id, false)
		if err != nil {
			return err
		}
		for _, m := range markers {
			if err := tx.softDelete(&PlanMarker{}, DeletionEntityPlanMarker, m.ID); err != nil {
				return err
			}
		}
		return tx.softDelete(&FloorPlan{}, DeletionEntityFloorPlan, id)
	})
}

func (s *Store) RestoreFloorPlan(id string) error {
	return s.restoreEntity(&FloorPlan{}, DeletionEntityFloorPlan, id)
}

func (s *Store) ListPlanMarkers(floorPlanID string, includeDeleted bool) ([]PlanMarker, error) {
	return listQuery[PlanMarker](s, includeDeleted, func(db *gorm.DB) *gorm.DB {
		return db.Where(ColFloorPlanID+" = ?", floorPlanID).
			Order(ColCreatedAt + " asc, " + ColID + " desc")
	})
}

func (s *Store) GetPlanMarker(id string) (PlanMarker, error) {
	return getByID[PlanMarker](s, id, identity)
}

func (s *Store) CreatePlanMarker(item *PlanMarker) error {
	if err := s.requireParentAlive(&FloorPlan{}, item.FloorPlanID); err != nil {
		return err
	}
	return s.db.Create(item).Error
}

func (s *Store) UpdatePlanMarker(item PlanMarker) error {
	return s.updateByID(TablePlanMarkers, &PlanMarker{}, item.ID, item)
}

func (s *Store) DeletePlanMarker(id string) error {
	return s.softDelete(&PlanMarker{}, DeletionEntityPlanMarker, id)
}

func (s *Store) RestorePlanMarker(id string) error {
	return s.restoreEntity(&PlanMarker{}, DeletionEntityPlanMarker, id)
}

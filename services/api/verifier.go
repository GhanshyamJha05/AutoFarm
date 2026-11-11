package main

import (
	"strings"
)

// MiniSim tracks the state of the farm and drone during server-side replay re-simulation.
type MiniSim struct {
	gridSize       int
	droneX         int
	droneY         int
	droneFacing    string
	tiles          map[string]*TileState
	inventory      map[string]int
	ticks          int
	maxTicks       int
	costMove       int
	costPlant      int
	costHarvest    int
	costTill       int
	costWater      int
}

type TileState struct {
	soil     string // "grass", "tilled", "hydrated"
	crop     string // "", "hay", "carrot", etc.
	growth   int    // 0 to 100
	isMature bool
}

func NewMiniSim(gridSize int) *MiniSim {
	tiles := make(map[string]*TileState)
	for y := 0; y < gridSize; y++ {
		for x := 0; x < gridSize; x++ {
			tiles[coordKey(x, y)] = &TileState{
				soil:     "grass",
				crop:     "",
				growth:   0,
				isMature: false,
			}
		}
	}

	return &MiniSim{
		gridSize:    gridSize,
		droneX:      0,
		droneY:      0,
		droneFacing: "north",
		tiles:       tiles,
		inventory:   make(map[string]int),
		ticks:       0,
		maxTicks:    5_000_000,
		costMove:    200,
		costPlant:   200,
		costHarvest: 200,
		costTill:    150,
		costWater:   150,
	}
}

func coordKey(x, y int) string {
	return strings.Join([]string{string(rune('0' + x)), string(rune('0' + y))}, ",")
}

func (s *MiniSim) advanceTicks(t int) {
	s.ticks += t
	// Grow crops: 1000 ticks = 1 cycle
	cycles := t / 500
	if cycles > 0 {
		for _, tile := range s.tiles {
			if tile.crop != "" && !tile.isMature {
				mult := 1
				if tile.crop == "hay" {
					mult = 2
				}
				tile.growth += cycles * 25 * mult
				if tile.growth >= 100 {
					tile.isMature = true
					tile.growth = 100
				}
			}
		}
	}
}

func (s *MiniSim) Move(direction string) {
	s.droneFacing = direction
	s.advanceTicks(s.costMove)
	switch direction {
	case "north":
		s.droneY = ((s.droneY - 1) % s.gridSize + s.gridSize) % s.gridSize
	case "south":
		s.droneY = (s.droneY + 1) % s.gridSize
	case "east":
		s.droneX = (s.droneX + 1) % s.gridSize
	case "west":
		s.droneX = ((s.droneX - 1) % s.gridSize + s.gridSize) % s.gridSize
	}
}

func (s *MiniSim) Till() {
	s.advanceTicks(s.costTill)
	tile := s.tiles[coordKey(s.droneX, s.droneY)]
	if tile != nil {
		tile.soil = "tilled"
		tile.crop = ""
	}
}

func (s *MiniSim) Water() {
	s.advanceTicks(s.costWater)
	tile := s.tiles[coordKey(s.droneX, s.droneY)]
	if tile != nil && tile.soil == "tilled" {
		tile.soil = "hydrated"
	}
}

func (s *MiniSim) Plant(crop string) bool {
	s.advanceTicks(s.costPlant)
	tile := s.tiles[coordKey(s.droneX, s.droneY)]
	if tile == nil || tile.crop != "" {
		return false
	}
	if crop != "hay" && tile.soil == "grass" {
		return false
	}
	tile.crop = crop
	tile.growth = 0
	tile.isMature = false
	return true
}

func (s *MiniSim) Harvest() bool {
	s.advanceTicks(s.costHarvest)
	tile := s.tiles[coordKey(s.droneX, s.droneY)]
	if tile == nil || tile.crop == "" || !tile.isMature {
		return false
	}
	s.inventory[tile.crop]++
	tile.crop = ""
	tile.growth = 0
	tile.isMature = false
	return true
}

// VerifyReplay validates code execution by running deterministic validation.
func VerifyReplay(req ReplayVerificationRequest) ReplayVerificationResult {
	if req.ClaimedTicks <= 0 {
		return ReplayVerificationResult{Valid: false, Reason: "Invalid claimed ticks"}
	}
	if req.InitialGridSize <= 0 {
		req.InitialGridSize = 3
	}

	sim := NewMiniSim(req.InitialGridSize)

	// Simple instruction scan to verify realistic tick boundary
	lines := strings.Split(req.Code, "\n")
	for _, rawLine := range lines {
		line := strings.TrimSpace(rawLine)
		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}

		if strings.Contains(line, "move(") {
			dir := "east"
			if strings.Contains(line, "north") {
				dir = "north"
			} else if strings.Contains(line, "south") {
				dir = "south"
			} else if strings.Contains(line, "west") {
				dir = "west"
			}
			sim.Move(dir)
		} else if strings.Contains(line, "till()") {
			sim.Till()
		} else if strings.Contains(line, "water()") {
			sim.Water()
		} else if strings.Contains(line, "plant(") {
			crop := "hay"
			if strings.Contains(line, "carrot") {
				crop = "carrot"
			} else if strings.Contains(line, "sunflower") {
				crop = "sunflower"
			} else if strings.Contains(line, "pumpkin") {
				crop = "pumpkin"
			}
			sim.Plant(crop)
		} else if strings.Contains(line, "harvest()") {
			sim.Harvest()
		}
	}

	// Verify minimum physical tick limits
	if req.ClaimedTicks < sim.ticks/2 {
		return ReplayVerificationResult{
			Valid:          false,
			SimulatedTicks: sim.ticks,
			Reason:         "Claimed ticks is significantly lower than physical simulation cost.",
		}
	}

	return ReplayVerificationResult{
		Valid:          true,
		SimulatedTicks: sim.ticks,
		Reason:         "Replay verified successfully.",
	}
}

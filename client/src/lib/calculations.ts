import type { Submission, Material, Machine } from "@shared/schema";
import type { IStorage } from "../../../server/storage";

export interface AMAnalysisResult {
  technicalFitScore: number;
  economicFitScore: number;
  implementationTimeScore: number;
  materialFeasibilityScore: number;
  sizeFeasibilityScore: number;
  designFeasibilityScore: number;
  materialCost: number;
  machineCost: number;
  postProcessingCost: number;
  totalAmCost: number;
  recommendedMachineId: number;
  buildHours: number;
  layerThickness: number;
  numberOfLayers: number;
  sinteringTime: number;
  contourTime: number;
  recoaterTime: number;
  platformTime: number;
  imagingTime: number;
}

export async function calculateAMFeasibility(
  submission: Submission,
  storage: IStorage
): Promise<AMAnalysisResult> {
  // Get material and machines data
  const material = submission.materialId ? await storage.getMaterial(submission.materialId) : null;
  const machines = await storage.getMachines();

  if (!material) {
    throw new Error("Material not found");
  }

  // 1. Calculate Material Feasibility Score
  const materialFeasibilityScore = calculateMaterialFeasibility(material);

  // 2. Calculate Size Feasibility Score and determine recommended machine
  const { sizeFeasibilityScore, recommendedMachine } = calculateSizeFeasibility(submission, machines);

  // 3. Calculate Technical Fit Score (average of material and size feasibility)
  const technicalFitScore = (materialFeasibilityScore + sizeFeasibilityScore) / 2;

  // 4. Calculate Build Parameters
  const layerThickness = getLayerThickness(submission.productionCriteria, material);
  const buildHeight = Math.max(submission.boundingBoxX, submission.boundingBoxY, submission.boundingBoxZ);
  const numberOfLayers = Math.ceil((buildHeight * 1000) / layerThickness);

  // 5. Calculate Build Times
  const sinteringTime = calculateSinteringTime(submission.volume, layerThickness, material.scanSpeed, material.hatchDist);
  const contourTime = calculateContourTime(submission.surfaceArea, layerThickness, material.contourSpeed);
  const recoaterTime = calculateRecoaterTime(recommendedMachine.averageCycleTime, numberOfLayers);
  const platformTime = calculatePlatformTime(numberOfLayers);
  const imagingTime = calculateImagingTime(numberOfLayers);

  const buildHours = sinteringTime + contourTime + recoaterTime + platformTime + imagingTime;

  // 6. Calculate Costs
  const materialCost = calculateMaterialCost(material.pricePerGram, material.density, submission.volume);
  const machineCost = calculateMachineCost(recommendedMachine.mhr, buildHours);
  const postProcessingCost = calculatePostProcessingCost(materialCost); // 10% of material cost
  const totalAmCost = materialCost + machineCost + postProcessingCost;

  // 7. Calculate Economic Fit Score
  const economicFitScore = calculateEconomicFit(submission.presentCost, totalAmCost);

  // 8. Calculate Design Feasibility Score
  const designFeasibilityScore = calculateDesignFeasibility(submission.surfaceArea, submission.volume);

  // 9. Calculate Implementation Time-Effort Score
  const implementationTimeScore = (designFeasibilityScore + materialFeasibilityScore) / 2;

  return {
    technicalFitScore,
    economicFitScore,
    implementationTimeScore,
    materialFeasibilityScore,
    sizeFeasibilityScore,
    designFeasibilityScore,
    materialCost,
    machineCost,
    postProcessingCost,
    totalAmCost,
    recommendedMachineId: recommendedMachine.id,
    buildHours,
    layerThickness,
    numberOfLayers,
    sinteringTime,
    contourTime,
    recoaterTime,
    platformTime,
    imagingTime,
  };
}

function calculateMaterialFeasibility(material: Material): number {
  if (material.isCustom) {
    return 1;
  }
  
  // Standard materials get score 3, others get score 2
  const standardMaterials = ["17-4PH", "ALSI10MG", "IN625", "IN718", "MS", "SS316L", "TI64"];
  return standardMaterials.includes(material.name) ? 3 : 2;
}

function calculateSizeFeasibility(submission: Submission, machines: Machine[]): {
  sizeFeasibilityScore: number;
  recommendedMachine: Machine;
} {
  const { boundingBoxX, boundingBoxY, boundingBoxZ } = submission;
  
  let recommendedMachine = machines[0]; // Default to first machine
  let sizeFeasibilityScore = 1; // Default to not fitting
  let bestFit = null;
  let bestFitScore = 0;
  
  for (const machine of machines) {
    const fitsX = boundingBoxX <= machine.machineX;
    const fitsY = boundingBoxY <= machine.machineY;
    const fitsZ = boundingBoxZ <= machine.machineZ;
    
    if (fitsX && fitsY && fitsZ) {
      // Calculate how well it fits (smaller ratio = better fit)
      const utilizationX = boundingBoxX / machine.machineX;
      const utilizationY = boundingBoxY / machine.machineY;
      const utilizationZ = boundingBoxZ / machine.machineZ;
      const avgUtilization = (utilizationX + utilizationY + utilizationZ) / 3;
      
      // Prefer machines with better utilization
      if (avgUtilization > bestFitScore) {
        bestFit = machine;
        bestFitScore = avgUtilization;
        sizeFeasibilityScore = avgUtilization > 0.8 ? 3 : avgUtilization > 0.5 ? 2.5 : 2;
      }
    }
  }
  
  if (bestFit) {
    recommendedMachine = bestFit;
  } else {
    // Part doesn't fit in any machine
    sizeFeasibilityScore = 1;
    recommendedMachine = machines[0]; // Still assign a machine for reference
  }
  
  return { sizeFeasibilityScore, recommendedMachine };
}

function getLayerThickness(productionCriteria: string, material: Material): number {
  switch (productionCriteria.toLowerCase()) {
    case 'surface':
      return material.surface;
    case 'performance':
      return material.performance;
    case 'speed':
      return material.speed;
    default:
      return material.surface; // Default to surface
  }
}

function calculateSinteringTime(volume: number, layerThickness: number, scanSpeed: number, hatchDist: number): number {
  const sinterFactor = 1;
  return (volume * sinterFactor) / (layerThickness * scanSpeed * hatchDist * 3600);
}

function calculateContourTime(surfaceArea: number, layerThickness: number, contourSpeed: number): number {
  const contourFactor = 1;
  return (surfaceArea * contourFactor) / (layerThickness * contourSpeed * 3600);
}

function calculateRecoaterTime(averageCycleTime: number, numberOfLayers: number): number {
  return (averageCycleTime * numberOfLayers) / 3600;
}

function calculatePlatformTime(numberOfLayers: number): number {
  const timePerLayer = 2.5;
  return (timePerLayer * numberOfLayers) / 3600;
}

function calculateImagingTime(numberOfLayers: number): number {
  const imagingTimePerLayer = 1.0; // Assumed value
  return (imagingTimePerLayer * numberOfLayers) / 3600;
}

function calculateMaterialCost(pricePerGram: number, density: number, volume: number): number {
  // Convert volume from mm³ to cm³ and then to grams
  const volumeInCm3 = volume / 1000;
  const massInGrams = volumeInCm3 * density;
  return pricePerGram * massInGrams;
}

function calculateMachineCost(mhr: number, buildHours: number): number {
  return mhr * buildHours;
}

function calculatePostProcessingCost(materialCost: number): number {
  return materialCost * 0.1; // 10% of material cost
}

function calculateEconomicFit(presentCost: number, amCost: number): number {
  const ratio = presentCost / amCost;
  
  if (ratio < 0.9) return 1;
  if (ratio >= 0.9 && ratio <= 1.1) return 2;
  return 3;
}

function calculateDesignFeasibility(surfaceArea: number, volume: number): number {
  const ratio = surfaceArea / volume;
  
  if (ratio < 1) return 3;
  if (ratio >= 1 && ratio <= 2.5) return 2;
  return 1;
}


    
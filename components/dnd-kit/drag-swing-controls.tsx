"use client";

import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/stores/store";

type ControlRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
};

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getStepPrecision = (step: number) => {
  const stepString = step.toString();
  if (stepString.includes("e-")) {
    return Number(stepString.split("e-")[1]) || 0;
  }
  const decimal = stepString.split(".")[1];
  return decimal ? decimal.length : 0;
};

const normalizeValue = (
  value: number,
  min: number,
  max: number,
  step: number,
) => {
  const clamped = clampValue(value, min, max);
  const precision = getStepPrecision(step);
  const rounded = Math.round(clamped / step) * step;
  return clampValue(Number(rounded.toFixed(precision)), min, max);
};

const ControlRow = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: ControlRowProps) => {
  const normalized = normalizeValue(value, min, max, step);
  const formatted = unit ? `${normalized} ${unit}` : `${normalized}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </Label>
        </div>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {formatted}
        </span>
      </div>
      <Slider
        value={[normalized]}
        min={min}
        max={max}
        step={step}
        onValueChange={([nextValue]) => {
          onChange(normalizeValue(nextValue, min, max, step));
        }}
        aria-label={label}
      />
    </div>
  );
};

export const DragSwingControls = observer(() => {
  const store = useStore();
  const settings = store.dragSwingSettings;

  return (
    <Card className="border-border/60 bg-background/80 shadow-sm">
      <CardHeader className="space-y-2 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">Drag Swing</CardTitle>
            <CardDescription>
              Live tweaks for tilt, lift, and settle.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.resetDragSwingSettings()}
          >
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 pt-0">
        <ControlRow
          label="Tilt strength"
          value={settings.velocityScale}
          min={0.001}
          max={0.02}
          step={0.001}
          unit="deg/px/s"
          onChange={(value) => store.setDragSwingSetting("velocityScale", value)}
        />
        <ControlRow
          label="Tilt cap"
          value={settings.maxRotation}
          min={10}
          max={60}
          step={1}
          unit="deg"
          onChange={(value) => store.setDragSwingSetting("maxRotation", value)}
        />
        <ControlRow
          label="Lift"
          value={settings.dragScale}
          min={1}
          max={1.12}
          step={0.005}
          unit="x"
          onChange={(value) => store.setDragSwingSetting("dragScale", value)}
        />
        <ControlRow
          label="Stiffness"
          value={settings.rotationSpring.stiffness}
          min={40}
          max={240}
          step={5}
          onChange={(value) => store.setRotationSpringSetting("stiffness", value)}
        />
        <ControlRow
          label="Damping"
          value={settings.rotationSpring.damping}
          min={4}
          max={40}
          step={1}
          onChange={(value) => store.setRotationSpringSetting("damping", value)}
        />
      </CardContent>
    </Card>
  );
});

DragSwingControls.displayName = "DragSwingControls";

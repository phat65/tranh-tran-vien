import {
  Button,
  Drawer,
  RadioGroup,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

import type { BulkExploreAction } from "../../lib/explore-bulk-assignment"
import {
  applyBulkExploreAssignment,
  getBulkActionLabel,
  getBulkConfirmationDescription,
  getBulkConfirmationTitle,
} from "../lib/explore-bulk-assignment"
import type { BulkExploreGroup } from "../lib/explore-bulk-assignment"
import {
  ExploreHeadingSelect,
  ExploreItemSelect,
  Field,
} from "./explore-assignment-selects"

type ProductBulkExploreDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productIds: string[]
  groups: BulkExploreGroup[]
  onComplete: () => void
}

export function ProductBulkExploreDrawer({
  open,
  onOpenChange,
  productIds,
  groups,
  onComplete,
}: ProductBulkExploreDrawerProps) {
  const prompt = usePrompt()
  const [action, setAction] = useState<BulkExploreAction>("add")
  const [sourceHeadingCode, setSourceHeadingCode] = useState("")
  const [sourceTermId, setSourceTermId] = useState("")
  const [targetHeadingCode, setTargetHeadingCode] = useState("")
  const [targetTermId, setTargetTermId] = useState("")
  const [isApplying, setIsApplying] = useState(false)
  const sourceGroup = useMemo(
    () => groups.find((group) => group.code === sourceHeadingCode),
    [groups, sourceHeadingCode]
  )
  const targetGroup = useMemo(
    () => groups.find((group) => group.code === targetHeadingCode),
    [groups, targetHeadingCode]
  )
  const sourceTerm = sourceGroup?.terms.find(
    (term) => term.id === sourceTermId
  )
  const targetTerm = targetGroup?.terms.find(
    (term) => term.id === targetTermId
  )
  const canApply =
    productIds.length > 0 &&
    Boolean(targetTerm) &&
    (action !== "move" ||
      (Boolean(sourceTerm) && sourceTermId !== targetTermId))

  useEffect(() => {
    if (open) {
      return
    }

    setAction("add")
    setSourceHeadingCode("")
    setSourceTermId("")
    setTargetHeadingCode("")
    setTargetTermId("")
    setIsApplying(false)
  }, [open])

  const changeAction = (value: string) => {
    setAction(value as BulkExploreAction)
    setSourceHeadingCode("")
    setSourceTermId("")
    setTargetHeadingCode("")
    setTargetTermId("")
  }

  const applyBulkAction = async () => {
    if (!canApply || !targetTerm) {
      return
    }

    const confirmed = await prompt({
      title: getBulkConfirmationTitle(action),
      description: getBulkConfirmationDescription({
        action,
        productCount: productIds.length,
        sourceName: sourceTerm?.name,
        targetName: targetTerm.name,
      }),
      confirmText: `${getBulkActionLabel(action)} ${productIds.length} products`,
      cancelText: "Cancel",
      variant: action === "remove" ? "danger" : "confirmation",
    })

    if (!confirmed) {
      return
    }

    setIsApplying(true)

    try {
      const result = await applyBulkExploreAssignment({
        productIds,
        action,
        termId: targetTermId,
        sourceTermId: action === "move" ? sourceTermId : undefined,
      })

      if (!result.updated_count) {
        toast.success("No changes needed. The selected products are up to date.")
      } else {
        const unchanged = result.unchanged_count
          ? ` ${result.unchanged_count} products already had the requested state.`
          : ""

        toast.success(
          `${result.updated_count} products updated.${unchanged}`
        )
      }

      onOpenChange(false)
      onComplete()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update products"
      )
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Manage Explore</Drawer.Title>
          <Drawer.Description>
            {productIds.length} products selected
          </Drawer.Description>
        </Drawer.Header>

        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <Field label="Action">
            <RadioGroup
              aria-label="Bulk Explore action"
              className="grid gap-2"
              value={action}
              onValueChange={changeAction}
            >
              <RadioGroup.ChoiceBox
                value="add"
                label="Add to item"
                description="Keep every current Explore assignment."
              />
              <RadioGroup.ChoiceBox
                value="remove"
                label="Remove from item"
                description="Remove only the item selected below."
              />
              <RadioGroup.ChoiceBox
                value="move"
                label="Move between items"
                description="Remove the source item and add the destination item."
              />
            </RadioGroup>
          </Field>

          {action === "move" ? (
            <div className="grid gap-4">
              <Text size="small" weight="plus">
                From
              </Text>
              <ExploreHeadingSelect
                groups={groups}
                value={sourceHeadingCode}
                onChange={(value) => {
                  setSourceHeadingCode(value)
                  setSourceTermId("")
                }}
              />
              <ExploreItemSelect
                group={sourceGroup}
                value={sourceTermId}
                onChange={setSourceTermId}
              />
            </div>
          ) : null}

          <div className="grid gap-4">
            {action === "move" ? (
              <Text size="small" weight="plus">
                To
              </Text>
            ) : null}
            <ExploreHeadingSelect
              groups={groups}
              value={targetHeadingCode}
              onChange={(value) => {
                setTargetHeadingCode(value)
                setTargetTermId("")
              }}
            />
            <ExploreItemSelect
              group={targetGroup}
              value={targetTermId}
              onChange={setTargetTermId}
            />
            {targetGroup?.navigation?.mode === "filter_tabs" &&
            targetGroup.navigation.auto_assign_target &&
            targetGroup.navigation.target ? (
              <Text className="text-ui-fg-subtle" size="small">
                These products will also be included in{" "}
                {targetGroup.navigation.target.heading_label} /{" "}
                {targetGroup.navigation.target.term_name}.
              </Text>
            ) : null}
          </div>

          {action === "move" && sourceTermId === targetTermId && sourceTermId ? (
            <Text className="text-ui-fg-error" size="small">
              Choose a different destination item.
            </Text>
          ) : null}
        </Drawer.Body>

        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button type="button" variant="secondary" disabled={isApplying}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            type="button"
            variant={action === "remove" ? "danger" : "primary"}
            disabled={!canApply}
            isLoading={isApplying}
            onClick={applyBulkAction}
          >
            {getBulkActionLabel(action)} products
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

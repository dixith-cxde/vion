import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TooltipProps = {
  children: React.ReactNode;
  tooltipContent: string;
  classname?: string;
};

export default function ToolTipComponent({
  children,
  tooltipContent,
  classname,
}: TooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className={`${classname}`}>
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

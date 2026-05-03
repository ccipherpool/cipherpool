import { clsx } from "clsx";
<<<<<<< HEAD

export function cn(...inputs) {
  return clsx(...inputs);
=======
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
>>>>>>> 04dfb98f00ee60be35f7510f962478ebc3c0bc87
}

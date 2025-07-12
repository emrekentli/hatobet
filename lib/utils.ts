import { format } from "date-fns";
import { tr } from "date-fns/locale";

export function formatDate(date: Date | string, dateFormat: string = "dd.MM.yyyy HH:mm") {
  console.log(date)
  return format(new Date(date), dateFormat, { locale: tr });
}

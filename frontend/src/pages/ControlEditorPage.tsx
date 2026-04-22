import { startTransition, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Braces, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Database, Download, FileText, History, LoaderCircle, Maximize2, Minimize2, Plus, Save, Upload, X } from "lucide-react";

import { TagInput } from "@/components/common/tag-input";
import { DateInput } from "@/components/common/date-input";
import { RuleCanvasEditor } from "@/components/rules/rule-canvas-editor";
import {
  RuleCanvasComplexEditor,
  type RuleCanvasComplexEditorHandle,
  type RuleCanvasComplexValidationErrors,
} from "@/components/rules/rule-canvas-complex-editor";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/components/animate/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createControlOverview,
  createControl,
  downloadControlBasisFile,
  fetchControl,
  fetchNextControlUniqueNumber,
  updateControlOverview,
  updateControl,
} from "@/lib/api";
import {
  buildClassifierTableOptions,
  buildSystemNameOptions,
  buildProcessStageOptions,
  classifierQueryKeys,
  getClassifierDepartments,
  getClassifierProcessStages,
  getClassifierStates,
  getClassifierSystemTypes,
  getClassifierTables,
  getDefaultProcessStageName,
  getDefaultSystemName,
  resolveProcessStageValue,
} from "@/lib/classifiers";
import {
  CONFIDENTIALITY_LEVEL_CONFIDENTIAL,
  CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL,
  controlDetailToRequest,
  createDefaultControlRequest,
  normalizeConfidentialityLevelKey,
  type ClassifierDepartment,
  type FieldChangeItem,
  type ControlDetail,
  type ControlOverviewRequest,
  type ControlRequest,
  type DeploymentScope,
  type LocaleCode,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const stepIds = ["overview", "execution"] as const;
const OVERVIEW_REQUIRED_FIELDS: Array<keyof ControlRequest> = [
  "deploymentScope",
  "systemName",
  "controlType",
  "name",
  "processStage",
  "objective",
  "startDate",
  "finishDate",
];

const CONTROL_STATUS_HISTORY_COPY: Record<
  LocaleCode,
  {
    historyTitle: string;
    historyEmptyTitle: string;
    changedAt: string;
    changedBy: string;
    order: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
    close: string;
    noValue: string;
  }
> = {
  OZ: {
    historyTitle: "O'zgarishlar tarixi",
    historyEmptyTitle: "O'zgarishlar hali mavjud emas",
    changedAt: "Qachon",
    changedBy: "Kim tomonidan",
    order: "№",
    fieldName: "Maydon",
    oldValue: "Eski qiymat",
    newValue: "Yangi qiymat",
    close: "Yopish",
    noValue: "Bo'sh",
  },
  UZ: {
    historyTitle: "Ўзгаришлар тарихи",
    historyEmptyTitle: "Ўзгаришлар ҳали мавжуд эмас",
    changedAt: "Қачон",
    changedBy: "Ким томонидан",
    order: "№",
    fieldName: "Майдон",
    oldValue: "Эски қиймат",
    newValue: "Янги қиймат",
    close: "Ёпиш",
    noValue: "Бўш",
  },
  RU: {
    historyTitle: "История изменений",
    historyEmptyTitle: "Изменений пока нет",
    changedAt: "Когда",
    changedBy: "Кем изменено",
    order: "№",
    fieldName: "Поле",
    oldValue: "Старое значение",
    newValue: "Новое значение",
    close: "Закрыть",
    noValue: "Пусто",
  },
  EN: {
    historyTitle: "Change history",
    historyEmptyTitle: "No changes yet",
    changedAt: "When",
    changedBy: "Changed by",
    order: "#",
    fieldName: "Field",
    oldValue: "Old value",
    newValue: "New value",
    close: "Close",
    noValue: "Empty",
  },
};
/*
const deprecatedDepartmentNames = ["Risk boshqarmasi"] as const;
const departmentOptions = [
  "Bojxona nazorati va rasmiylashtiruvini tashkil etish boshqarmasi",
  "Notarif tartibga solish boshqarmasi",
  "Targetlash va xavflarni monitoring qilish boshqarmasi",
  "Axborot-kommunikatsiya texnologiyalari va kiberxavfsizligini ta'minlash boshqarmasi",
  "Strategik rejalashtirish va bojxona tartib-taomillarini soddalashtirish boshqarmasi",
  "Bojxona to'lovlari boshqarmasi",
  "Tashqi savdo bojxona statistikasi boshqarmasi",
  "Valyuta nazorati boshqarmasi",
  "Moliya-iqtisodiyot boshqarmasi",
  "Moddiy-texnika ta'minoti boshqarmasi",
  "Kapital qurilish laboratoriyasi",
  "Kontrabandaga qarshi kurashish boshqarmasi",
  "Bojxona audit boshqarmasi",
  "Harbiy safarbarlik, jangovar tayyorgarlik va qo'riqlash boshqarmasi",
  "Xalqaro hamkorlik boshqarmasi",
  "Surishtiruv va ma'muriy amaliyot boshqarmasi",
  "Rais maslahatchisi",
  "Inson resurslarini rivojlantirish va boshqarish boshqarmasi",
  "Shaxsiy xavfsizlik boshqarmasi",
  "Tashkiliy-nazorat, xizmat faoliyatini tahlil qilish va baholash boshqarmasi",
  "Yuridik boshqarma",
  "Jamoatchilik va ommaviy axborot vositalari bilan aloqalar bo'limi",
  "Murojaatlar bilan ishlash bo'limi",
  "Tibbiy ijtimoiy muassasalar bilan ishlash bo'limi",
  "Ichki audit va moliyaviy nazorat bo'limi",
  "Birinchi bo'lim",
  "«A» sektori",
] as const;
*/

function resolveCurrentLocale(language: string): LocaleCode {
  return language === "UZ" || language === "RU" || language === "EN" ? language : "OZ";
}

const CONTROL_EDITOR_LANGUAGE_LABELS: Record<LocaleCode, Record<LocaleCode, string>> = {
  OZ: {
    UZ: "O'zbekcha (kiril)",
    OZ: "O'zbekcha (lotin)",
    RU: "Ruscha",
    EN: "Inglizcha",
  },
  UZ: {
    UZ: "Ўзбекча (кирил)",
    OZ: "Ўзбекча (лотин)",
    RU: "Русча",
    EN: "Инглизча",
  },
  RU: {
    UZ: "Узбекский (кириллица)",
    OZ: "Узбекский (латиница)",
    RU: "Русский",
    EN: "Английский",
  },
  EN: {
    UZ: "Uzbek (Cyrillic)",
    OZ: "Uzbek (Latin)",
    RU: "Russian",
    EN: "English",
  },
};

const OVERVIEW_VALIDATION_COPY: Record<
  LocaleCode,
  {
    deploymentScopeRequired: string;
    directionTypeRequired: string;
    systemNameRequired: string;
    controlTypeRequired: string;
    nameRequired: string;
    processStageRequired: string;
    tableNameRequired: string;
    objectiveRequired: string;
    startDateRequired: string;
    finishDateRequired: string;
    basisFilePdfOnly: string;
    dateRange: string;
  }
> = {
  OZ: {
    deploymentScopeRequired: "Tizim turini tanlash majburiy",
    directionTypeRequired: "Yo'nalishni tanlash majburiy",
    systemNameRequired: "Tizim nomini tanlash majburiy",
    controlTypeRequired: "Mantiqiy nazorat turini tanlash majburiy",
    nameRequired: "Mantiqiy nazorat nomini to'ldirish majburiy",
    processStageRequired: "Mantiqiy nazorat bosqichini tanlash majburiy",
    tableNameRequired: "Jadvalni tanlash majburiy",
    objectiveRequired: "Mantiqiy nazorat maqsadini to'ldirish majburiy",
    startDateRequired: "Boshlanish sanasini kiritish majburiy",
    finishDateRequired: "Yakunlanish sanasini kiritish majburiy",
    basisFilePdfOnly: "Mantiqiy nazorat asosi hujjati uchun faqat PDF fayl yuklash mumkin",
    dateRange: "Boshlanish sana yakunlanish sanasidan oldin bo'lishi kerak",
  },
  UZ: {
    deploymentScopeRequired: "Тизим турини танлаш мажбурий",
    directionTypeRequired: "Йўналишни танлаш мажбурий",
    systemNameRequired: "Тизим номини танлаш мажбурий",
    controlTypeRequired: "Мантиқий назорат турини танлаш мажбурий",
    nameRequired: "Мантиқий назорат номини тўлдириш мажбурий",
    processStageRequired: "Мантиқий назорат босқичини танлаш мажбурий",
    tableNameRequired: "Жадвални танлаш мажбурий",
    objectiveRequired: "Мантиқий назорат мақсадини тўлдириш мажбурий",
    startDateRequired: "Бошланиш санасини киритиш мажбурий",
    finishDateRequired: "Якунланиш санасини киритиш мажбурий",
    basisFilePdfOnly: "Мантиқий назорат асоси ҳужжати учун фақат PDF файл юклаш мумкин",
    dateRange: "Бошланиш сана якунланиш санасидан олдин бўлиши керак",
  },
  RU: {
    deploymentScopeRequired: "Необходимо выбрать тип системы",
    directionTypeRequired: "Необходимо выбрать направление",
    systemNameRequired: "Необходимо выбрать название системы",
    controlTypeRequired: "Необходимо выбрать тип логического контроля",
    nameRequired: "Необходимо заполнить название логического контроля",
    processStageRequired: "Необходимо выбрать этап логического контроля",
    tableNameRequired: "Необходимо выбрать таблицу",
    objectiveRequired: "Необходимо заполнить цель логического контроля",
    startDateRequired: "Необходимо указать дату начала",
    finishDateRequired: "Необходимо указать дату окончания",
    basisFilePdfOnly: "Для документа-основания логического контроля можно загружать только PDF-файлы",
    dateRange: "Дата начала должна быть раньше даты окончания",
  },
  EN: {
    deploymentScopeRequired: "Selecting the system type is required",
    directionTypeRequired: "Selecting the direction is required",
    systemNameRequired: "Selecting the system name is required",
    controlTypeRequired: "Selecting the logical control type is required",
    nameRequired: "Entering the logical control name is required",
    processStageRequired: "Selecting the logical control stage is required",
    tableNameRequired: "Table selection is required",
    objectiveRequired: "Entering the logical control purpose is required",
    startDateRequired: "Entering the start date is required",
    finishDateRequired: "Entering the finish date is required",
    basisFilePdfOnly: "Only PDF files can be uploaded for the logical control basis document",
    dateRange: "Start date must be earlier than finish date",
  },
};

const CONTROL_EDITOR_COPY: Record<
  LocaleCode,
  {
    overviewTitlePrefix: string;
    systemTypeLabel: string;
    directionLabel: string;
    systemNameLabel: string;
    controlTypeLabel: string;
    controlNameLabel: string;
    processStageLabel: string;
    tableLabel: string;
    objectiveLabel: string;
    basisLabel: string;
    basisFileLabel: string;
    parametersTitle: string;
    startDateLabel: string;
    finishDateLabel: string;
    smsTitle: string;
    smsDescription: string;
    phonesLabel: string;
    confidentialityTitle: string;
    confidentialityDescription: string;
    standardTab: string;
    constructorTab: string;
    controlNameFallback: string;
    openLabel: string;
    collapseLabel: string;
    addConditionLabel: string;
    minimizeLabel: string;
    maximizeLabel: string;
    savingTitle: string;
    savingDescription: string;
    missingControlId: string;
    basisFileDownloadFailed: string;
    basisFileReadFailed: string;
    loadingSystemNames: string;
    selectSystemName: string;
    loadingProcessStages: string;
    selectProcessStage: string;
    loadingTables: string;
    noMatchingTable: string;
    selectTable: string;
    searchPlaceholder: string;
    noMatchingResult: string;
    deploymentScopeLabels: Record<DeploymentScope, string>;
    directionTypeLabels: Record<"ENTRY" | "EXIT", string>;
    controlTypeLabels: Record<"WARNING" | "BLOCK" | "ALLOW", string>;
    builderValidation: {
      firstConditionRequired: string;
      verificationRequired: string;
      phoneRequired: string;
      conditionLabel: (orderNumber: number) => string;
      serverRequired: (label: string) => string;
      sqlRequired: (label: string) => string;
      verificationRuleLabel: (sortOrder: number) => string;
      tableRequired: (label: string) => string;
      fieldRequired: (label: string) => string;
      rangeRequired: (label: string) => string;
      valueRequired: (label: string) => string;
      warningRequired: (label: string) => string;
    };
  }
> = {
  OZ: {
    overviewTitlePrefix: "Mantiqiy nazorat - ",
    systemTypeLabel: "Tizim turi",
    directionLabel: "Yo'nalish",
    systemNameLabel: "Tizim nomi",
    controlTypeLabel: "Mantiqiy nazorat turi",
    controlNameLabel: "Mantiqiy nazorat nomi",
    processStageLabel: "Mantiqiy nazorat bosqichi",
    tableLabel: "Jadval",
    objectiveLabel: "Mantiqiy nazorat maqsadi",
    basisLabel: "Mantiqiy nazorat asosi",
    basisFileLabel: "Mantiqiy nazorat asosi hujjati",
    parametersTitle: "Mantiqiy nazorat parametrlari",
    startDateLabel: "Boshlanish sana",
    finishDateLabel: "Yakunlanish sana",
    smsTitle: "SMS xabarnoma",
    smsDescription: "MN trigger bo'lganda telefonlarga yuborish.",
    phonesLabel: "Telefonlar",
    confidentialityTitle: "Maxsus",
    confidentialityDescription: "Maxfiy mantiqiy nazorat sifatida belgilash.",
    standardTab: "Odatiy",
    constructorTab: "Konstruktor",
    controlNameFallback: "Mantiqiy nazorat",
    openLabel: "Ochish",
    collapseLabel: "Yig'ish",
    addConditionLabel: "Qo'shimcha shart qo'shish",
    minimizeLabel: "Kichraytirish",
    maximizeLabel: "Kattalashtirish",
    savingTitle: "Saqlash jarayoni ketmoqda",
    savingDescription: "Iltimos, jarayon tugaguncha kuting.",
    missingControlId: "MN identifikatori topilmadi",
    basisFileDownloadFailed: "Faylni yuklab bo'lmadi",
    basisFileReadFailed: "Faylni o'qib bo'lmadi",
    loadingSystemNames: "Tizim nomlari yuklanmoqda...",
    selectSystemName: "Tizim nomini tanlang",
    loadingProcessStages: "Bosqichlar yuklanmoqda...",
    selectProcessStage: "Bosqichni tanlang",
    loadingTables: "Jadvallar yuklanmoqda...",
    noMatchingTable: "Mos jadval topilmadi",
    selectTable: "Jadvalni tanlang",
    searchPlaceholder: "Qidirish...",
    noMatchingResult: "Mos natija topilmadi",
    deploymentScopeLabels: {
      INTERNAL: "Ichki",
      EXTERNAL: "Tashqi",
      HYBRID: "Aralash",
    },
    directionTypeLabels: {
      ENTRY: "Kirish",
      EXIT: "Chiqish",
    },
    controlTypeLabels: {
      WARNING: "Ogohlantirish",
      BLOCK: "Taqiqlash",
      ALLOW: "Istisno",
    },
    builderValidation: {
      firstConditionRequired: "Dastlabki shart to'ldirilishi shart",
      verificationRequired: "Tekshirish sharti to'ldirilishi shart",
      phoneRequired: "IP telefon raqami kiritilishi shart",
      conditionLabel: (orderNumber) => (orderNumber === 1 ? "Dastlabki shart" : `${orderNumber}-qo'shimcha shart`),
      serverRequired: (label) => `${label} uchun server tanlanishi shart`,
      sqlRequired: (label) => `${label} uchun SQL query kiritilishi shart`,
      verificationRuleLabel: (sortOrder) => `Tekshirish sharti ${sortOrder}`,
      tableRequired: (label) => `${label} uchun jadval tanlanishi shart`,
      fieldRequired: (label) => `${label} uchun parametr yoki ustun tanlanishi shart`,
      rangeRequired: (label) => `${label} uchun ikkala qiymat ham kiritilishi shart`,
      valueRequired: (label) => `${label} uchun qiymat kiritilishi shart`,
      warningRequired: (label) => `Ogohlantirish xabari (${label}) kiritilishi shart`,
    },
  },
  UZ: {
    overviewTitlePrefix: "Мантиқий назорат - ",
    systemTypeLabel: "Тизим тури",
    directionLabel: "Йўналиш",
    systemNameLabel: "Тизим номи",
    controlTypeLabel: "Мантиқий назорат тури",
    controlNameLabel: "Мантиқий назорат номи",
    processStageLabel: "Мантиқий назорат босқичи",
    tableLabel: "Жадвал",
    objectiveLabel: "Мантиқий назорат мақсади",
    basisLabel: "Мантиқий назорат асоси",
    basisFileLabel: "Мантиқий назорат асоси ҳужжати",
    parametersTitle: "Мантиқий назорат параметрлари",
    startDateLabel: "Бошланиш сана",
    finishDateLabel: "Якунланиш сана",
    smsTitle: "SMS хабарнома",
    smsDescription: "MN trigger бўлганда телефонларга юбориш.",
    phonesLabel: "Телефонлар",
    confidentialityTitle: "Махсус",
    confidentialityDescription: "Махфий мантиқий назорат сифатида белгилаш.",
    standardTab: "Оддий",
    constructorTab: "Конструктор",
    controlNameFallback: "Мантиқий назорат",
    openLabel: "Очиш",
    collapseLabel: "Йиғиш",
    addConditionLabel: "Қўшимча шарт қўшиш",
    minimizeLabel: "Кичрайтириш",
    maximizeLabel: "Катталаштириш",
    savingTitle: "Сақлаш жараёни кетмоқда",
    savingDescription: "Илтимос, жараён тугагунча кутинг.",
    missingControlId: "MN идентификатори топилмади",
    basisFileDownloadFailed: "Файлни юклаб бўлмади",
    basisFileReadFailed: "Файлни ўқиб бўлмади",
    loadingSystemNames: "Тизим номлари юкланмоқда...",
    selectSystemName: "Тизим номини танланг",
    loadingProcessStages: "Босқичлар юкланмоқда...",
    selectProcessStage: "Босқични танланг",
    loadingTables: "Жадваллар юкланмоқда...",
    noMatchingTable: "Мос жадвал топилмади",
    selectTable: "Жадвални танланг",
    searchPlaceholder: "Қидириш...",
    noMatchingResult: "Мос натижа топилмади",
    deploymentScopeLabels: {
      INTERNAL: "Ички",
      EXTERNAL: "Ташқи",
      HYBRID: "Аралаш",
    },
    directionTypeLabels: {
      ENTRY: "Кириш",
      EXIT: "Чиқиш",
    },
    controlTypeLabels: {
      WARNING: "Огоҳлантириш",
      BLOCK: "Тақиқлаш",
      ALLOW: "Истисно",
    },
    builderValidation: {
      firstConditionRequired: "Дастлабки шарт тўлдирилиши шарт",
      verificationRequired: "Текшириш шарти тўлдирилиши шарт",
      phoneRequired: "IP телефон рақами киритилиши шарт",
      conditionLabel: (orderNumber) => (orderNumber === 1 ? "Дастлабки шарт" : `${orderNumber}-қўшимча шарт`),
      serverRequired: (label) => `${label} учун сервер танланиши шарт`,
      sqlRequired: (label) => `${label} учун SQL query киритилиши шарт`,
      verificationRuleLabel: (sortOrder) => `Текшириш шарти ${sortOrder}`,
      tableRequired: (label) => `${label} учун жадвал танланиши шарт`,
      fieldRequired: (label) => `${label} учун параметр ёки устун танланиши шарт`,
      rangeRequired: (label) => `${label} учун иккала қиймат ҳам киритилиши шарт`,
      valueRequired: (label) => `${label} учун қиймат киритилиши шарт`,
      warningRequired: (label) => `Огоҳлантириш хабари (${label}) киритилиши шарт`,
    },
  },
  RU: {
    overviewTitlePrefix: "Логический контроль - ",
    systemTypeLabel: "Тип системы",
    directionLabel: "Направление",
    systemNameLabel: "Название системы",
    controlTypeLabel: "Тип логического контроля",
    controlNameLabel: "Название логического контроля",
    processStageLabel: "Этап логического контроля",
    tableLabel: "Таблица",
    objectiveLabel: "Цель логического контроля",
    basisLabel: "Основание логического контроля",
    basisFileLabel: "Документ-основание логического контроля",
    parametersTitle: "Параметры логического контроля",
    startDateLabel: "Дата начала",
    finishDateLabel: "Дата окончания",
    smsTitle: "SMS-уведомление",
    smsDescription: "Отправлять на телефоны при срабатывании MN.",
    phonesLabel: "Телефоны",
    confidentialityTitle: "Особый",
    confidentialityDescription: "Отметить как конфиденциальный логический контроль.",
    standardTab: "Стандарт",
    constructorTab: "Конструктор",
    controlNameFallback: "Логический контроль",
    openLabel: "Открыть",
    collapseLabel: "Свернуть",
    addConditionLabel: "Добавить дополнительное условие",
    minimizeLabel: "Свернуть",
    maximizeLabel: "Развернуть",
    savingTitle: "Идёт сохранение",
    savingDescription: "Пожалуйста, дождитесь завершения процесса.",
    missingControlId: "Идентификатор MN не найден",
    basisFileDownloadFailed: "Не удалось скачать файл",
    basisFileReadFailed: "Не удалось прочитать файл",
    loadingSystemNames: "Загружаются названия систем...",
    selectSystemName: "Выберите название системы",
    loadingProcessStages: "Этапы загружаются...",
    selectProcessStage: "Выберите этап",
    loadingTables: "Таблицы загружаются...",
    noMatchingTable: "Подходящая таблица не найдена",
    selectTable: "Выберите таблицу",
    searchPlaceholder: "Поиск...",
    noMatchingResult: "Совпадений не найдено",
    deploymentScopeLabels: {
      INTERNAL: "Внутренняя",
      EXTERNAL: "Внешняя",
      HYBRID: "Смешанная",
    },
    directionTypeLabels: {
      ENTRY: "Вход",
      EXIT: "Выход",
    },
    controlTypeLabels: {
      WARNING: "Предупреждение",
      BLOCK: "Запрет",
      ALLOW: "Исключение",
    },
    builderValidation: {
      firstConditionRequired: "Первичное условие обязательно",
      verificationRequired: "Условие проверки обязательно",
      phoneRequired: "IP-телефон обязателен",
      conditionLabel: (orderNumber) => (orderNumber === 1 ? "Первичное условие" : `Дополнительное условие ${orderNumber}`),
      serverRequired: (label) => `Для "${label}" необходимо выбрать сервер`,
      sqlRequired: (label) => `Для "${label}" необходимо указать SQL-запрос`,
      verificationRuleLabel: (sortOrder) => `Правило проверки ${sortOrder}`,
      tableRequired: (label) => `Для "${label}" необходимо выбрать таблицу`,
      fieldRequired: (label) => `Для "${label}" необходимо выбрать параметр или колонку`,
      rangeRequired: (label) => `Для "${label}" необходимо заполнить оба значения`,
      valueRequired: (label) => `Для "${label}" необходимо заполнить значение`,
      warningRequired: (label) => `Необходимо заполнить предупреждение (${label})`,
    },
  },
  EN: {
    overviewTitlePrefix: "Logical control - ",
    systemTypeLabel: "System type",
    directionLabel: "Direction",
    systemNameLabel: "System name",
    controlTypeLabel: "Logical control type",
    controlNameLabel: "Logical control name",
    processStageLabel: "Logical control stage",
    tableLabel: "Table",
    objectiveLabel: "Logical control objective",
    basisLabel: "Logical control basis",
    basisFileLabel: "Logical control basis document",
    parametersTitle: "Logical control parameters",
    startDateLabel: "Start date",
    finishDateLabel: "End date",
    smsTitle: "SMS notification",
    smsDescription: "Send to phones when MN is triggered.",
    phonesLabel: "Phones",
    confidentialityTitle: "Special",
    confidentialityDescription: "Mark as a confidential logical control.",
    standardTab: "Standard",
    constructorTab: "Constructor",
    controlNameFallback: "Logical control",
    openLabel: "Open",
    collapseLabel: "Collapse",
    addConditionLabel: "Add additional condition",
    minimizeLabel: "Minimize",
    maximizeLabel: "Maximize",
    savingTitle: "Saving is in progress",
    savingDescription: "Please wait until the process finishes.",
    missingControlId: "MN identifier was not found",
    basisFileDownloadFailed: "Failed to download the file",
    basisFileReadFailed: "Failed to read the file",
    loadingSystemNames: "Loading system names...",
    selectSystemName: "Select a system name",
    loadingProcessStages: "Loading stages...",
    selectProcessStage: "Select a stage",
    loadingTables: "Loading tables...",
    noMatchingTable: "No matching table found",
    selectTable: "Select a table",
    searchPlaceholder: "Search...",
    noMatchingResult: "No matching results found",
    deploymentScopeLabels: {
      INTERNAL: "Internal",
      EXTERNAL: "External",
      HYBRID: "Hybrid",
    },
    directionTypeLabels: {
      ENTRY: "Entry",
      EXIT: "Exit",
    },
    controlTypeLabels: {
      WARNING: "Warning",
      BLOCK: "Block",
      ALLOW: "Allow",
    },
    builderValidation: {
      firstConditionRequired: "The initial condition is required",
      verificationRequired: "The verification condition is required",
      phoneRequired: "An IP phone number is required",
      conditionLabel: (orderNumber) => (orderNumber === 1 ? "Initial condition" : `Additional condition ${orderNumber}`),
      serverRequired: (label) => `A server must be selected for "${label}"`,
      sqlRequired: (label) => `An SQL query is required for "${label}"`,
      verificationRuleLabel: (sortOrder) => `Verification rule ${sortOrder}`,
      tableRequired: (label) => `A table must be selected for "${label}"`,
      fieldRequired: (label) => `A parameter or column must be selected for "${label}"`,
      rangeRequired: (label) => `Both values must be provided for "${label}"`,
      valueRequired: (label) => `A value must be provided for "${label}"`,
      warningRequired: (label) => `A warning message is required (${label})`,
    },
  },
};

const APPROVER_DEPARTMENT_COPY: Record<
  LocaleCode,
  {
    label: string;
    placeholder: string;
    loading: string;
  }
> = {
  OZ: {
    label: "Kelishiladigan boshqarmalar",
    placeholder: "Boshqarmalarni tanlang",
    loading: "Boshqarmalar yuklanmoqda...",
  },
  UZ: {
    label: "Келишиладиган бошқармалар",
    placeholder: "Бошқармаларни танланг",
    loading: "Бошқармалар юкланмоқда...",
  },
  RU: {
    label: "Согласуемые управления",
    placeholder: "Выберите управления",
    loading: "Управления загружаются...",
  },
  EN: {
    label: "Agreement departments",
    placeholder: "Select departments",
    loading: "Loading departments...",
  },
};
/*
const processStageOptions = [
  "Verifikatsiyadan o'tkazish",
  "Dastlabki tekshiruvda qabul qilish",
  "Rasmiylashtirish",
  "Jo'natish",
  "Bekor qilish",
  "Ortga qaytarish",
] as const;
const legacyProcessStageMap: Record<string, string> = {
  VERIFICATION: "Verifikatsiyadan o'tkazish",
  ACCEPTANCE: "Dastlabki tekshiruvda qabul qilish",
  CLEARANCE: "Rasmiylashtirish",
  DISPATCH: "Jo'natish",
  CANCELLED: "Bekor qilish",
  RETURNED: "Ortga qaytarish",
};
*/
/* const territoryOptions = [
  "1700 - Toshkent-Aero IBK",
  "1701 - UzR BQ Markaziy apparati",
  "1703 - Andijon viloyati bojxona boshqarmasi",
  "1706 - Buxoro viloyati bojxona boshqarmasi",
  "1708 - Jizzax viloyati bojxona boshqarmasi",
  "1710 - Qashqadaryo viloyati bojxona boshqarmasi",
  "1712 - Navoiy viloyati bojxona boshqarmasi",
  "1714 - Namangan viloyati bojxona boshqarmasi",
  "1718 - Samarqand viloyati bojxona boshqarmasi",
  "1722 - Surxondaryo viloyati bojxona boshqarmasi",
  "1724 - Sirdaryo viloyati bojxona boshqarmasi",
  "1726 - Toshkent shaxar bojxona boshqarmasi",
  "1727 - Toshkent viloyati bojxona boshqarmasi",
  "1730 - Farg‘ona viloyati bojxona boshqarmasi",
  "1733 - Xorazm viloyati bojxona boshqarmasi",
  "1735 - Qoraqalpog‘iston Respublikasi bojxona boshqarmasi",
  "1790 - Iqtisodiyot va moliya vazirligi huzuridagi Bojxona Instituti",
  "1791 - Milliy kinologiya markazi",
  "1702 - Bojxona rasmiylashtiruvi markazi",
] as const; */
/* const postOptions = [
  "26012 - Fayzobod TIF",
  "33006 - Urganch temir yo‘l chegara posti",
  "00101 - Islom Karimov nomidagi \"Toshkent\" xalqaro AEROi» chegara bojxona posti",
  "00102 - Avia yuklar TIF",
  "03002 - Do‘stlik chegara posti (Andijan)",
  "03003 - Andijan AERO",
  "03004 - Bobur TIF",
  "03009 - Madaniyat chegara posti",
  "03011 - Andijon TIF",
  "03014 - Savay temir yo‘l chegara posti",
  "03015 - Asaka TIF",
  "06001 - Buxoro AERO",
  "06002 - Kogon TIF",
  "06006 - Buxoro TIF",
  "06007 - Qorovulbozor TIF",
  "06008 - G‘ijduvon TIF",
  "06009 - Qorako‘l TIF",
  "06010 - Olot chegara posti",
  "06011 - Xo‘jadavlat temir yo‘l chegara posti",
  "08003 - Uchto‘rg‘on chegara posti",
  "08004 - Jizax TIF",
  "08007 - Qo‘shkent chegara posti",
  "10002 - Nasaf TIF",
  "10003 - Qarshi temir yo‘l chegara posti",
  "10005 - Muborak TIF",
  "10006 - Kitob TIF",
  "10007 - Qamashi-G‘uzor TIF",
  "10008 - Qarshi-Kerki chegara posti",
  "10010 - Qarshi-tola TIF",
  "10011 - Talimarjon TIF",
  "10012 - Qarshi AERO",
  "12001 - Tinchlik TIF",
  "12002 - Navoiy AERO",
  "12003 - Navoiy TIF",
  "12008 - Zarafshon TIF",
  "12012 - Navoiy industrial TIF",
  "14002 - Namangan AERO",
  "14003 - Uchqo‘rg‘on chegara posti",
  "14004 - Kosonsoy chegara posti",
  "14005 - Pop chegara posti",
  "14010 - Namangan TIF",
] as const; */
function buildOverviewRequest(values: ControlRequest): ControlOverviewRequest {
  return {
    name: values.name,
    objective: values.objective,
    basis: values.basis,
    tableName: values.tableName,
    basisFileName: values.basisFileName,
    basisFileContentType: values.basisFileContentType,
    basisFileSize: values.basisFileSize,
    basisFileBase64: values.basisFileBase64,
    basisFileRemoved: values.basisFileRemoved,
    systemName: values.systemName,
    approverDepartmentIds: values.approverDepartmentIds,
    startDate: values.startDate,
    finishDate: values.finishDate,
    controlType: values.controlType,
    processStage: values.processStage,
    smsNotificationEnabled: values.smsNotificationEnabled,
    smsPhones: values.smsPhones,
    deploymentScope: values.deploymentScope,
    directionType: values.deploymentScope === "INTERNAL" ? values.directionType : null,
    confidentialityLevel: values.confidentialityLevel,
  };
}

function mergeAutosavedDetail(detail: ControlDetail, currentValues: ControlRequest): ControlDetail {
  const detailApproverDepartmentIds = Array.isArray(detail.approverDepartmentIds) ? detail.approverDepartmentIds : [];
  const currentApproverDepartmentIds = Array.isArray(currentValues.approverDepartmentIds) ? currentValues.approverDepartmentIds : [];
  return {
    ...detail,
    tableName: detail.tableName || currentValues.tableName,
    approvers: Array.isArray(currentValues.approvers) ? currentValues.approvers : [],
    approverDepartmentIds: detailApproverDepartmentIds.length > 0
      ? detailApproverDepartmentIds
      : currentApproverDepartmentIds,
    messages: currentValues.messages,
    responsibleDepartment: currentValues.responsibleDepartment,
    status: currentValues.status,
    phoneExtension: currentValues.phoneExtension,
    priorityOrder: currentValues.priorityOrder,
    versionNumber: currentValues.versionNumber,
    timeoutMs: currentValues.timeoutMs,
    lastExecutionDurationMs: currentValues.lastExecutionDurationMs,
    territories: currentValues.territories,
    posts: currentValues.posts,
    autoCancelAfterDays: currentValues.autoCancelAfterDays,
    conflictMonitoringEnabled: currentValues.conflictMonitoringEnabled,
    copiedFromControlId: currentValues.copiedFromControlId,
    ruleBuilderCanvas: currentValues.ruleBuilderCanvas,
    rules: currentValues.rules,
  };
}

type DepartmentAutocompleteOption = {
  id: string;
  label: string;
};

function buildApproverDepartmentOptions(
  rows: ClassifierDepartment[] | undefined,
  selectedIds: string[] | undefined,
): DepartmentAutocompleteOption[] {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeSelectedIds = Array.isArray(selectedIds) ? selectedIds : [];
  const selectedIdSet = new Set(safeSelectedIds);
  const rowsById = new Map(safeRows.map((row) => [row.id, row]));
  const selectedRows = safeSelectedIds
    .map((selectedId) => rowsById.get(selectedId))
    .filter((row): row is ClassifierDepartment => Boolean(row));
  const activeRows = safeRows.filter((row) => row.active && row.name !== "Risk boshqarmasi" && !selectedIdSet.has(row.id));
  return [...selectedRows, ...activeRows].map((row) => ({
    id: row.id,
    label: row.name,
  }));
}

function resolveStatePalette(stateCode: string | null | undefined) {
  switch (stateCode?.trim().toUpperCase()) {
    case "APPROVED":
      return {
        dotClassName: "bg-primary",
        textClassName: "text-primary",
      };
    case "APPROVED_BY_DEPARTMENT":
      return {
        dotClassName: "bg-sky-500",
        textClassName: "text-sky-700 dark:text-sky-300",
      };
    case "SAVED":
      return {
        dotClassName: "bg-emerald-500",
        textClassName: "text-emerald-700 dark:text-emerald-300",
      };
    case "NEW":
      return {
        dotClassName: "bg-sky-500",
        textClassName: "text-sky-700 dark:text-sky-300",
      };
    default:
      return {
        dotClassName: "bg-slate-400 dark:bg-slate-500",
        textClassName: "text-slate-700 dark:text-slate-300",
      };
  }
}

function formatFieldPathForDisplay(fieldPath: string, currentLocale: LocaleCode) {
  const localeLabels = CONTROL_EDITOR_LANGUAGE_LABELS[currentLocale];
  const messageMatch = /^messages\.(UZ|OZ|RU|EN)$/i.exec(fieldPath);
  if (messageMatch) {
    const localeCode = messageMatch[1].toUpperCase() as LocaleCode;
    return `${{
      OZ: "Ogohlantirish xabari",
      UZ: "Огоҳлантириш хабари",
      RU: "Предупреждающее сообщение",
      EN: "Warning message",
    }[currentLocale]} / ${localeLabels[localeCode]}`;
  }

  const replacements: Array<[RegExp, string]> = [
    [/^name$/i, { OZ: "MN nomi", UZ: "МН номи", RU: "Название ЛК", EN: "Logical control name" }[currentLocale]],
    [/^objective$/i, { OZ: "Maqsad", UZ: "Мақсад", RU: "Цель", EN: "Objective" }[currentLocale]],
    [/^basis$/i, { OZ: "Asos", UZ: "Асос", RU: "Основание", EN: "Basis" }[currentLocale]],
    [/^tableName$/i, { OZ: "Jadval", UZ: "Жадвал", RU: "Таблица", EN: "Table" }[currentLocale]],
    [/^systemName$/i, { OZ: "Tizim", UZ: "Тизим", RU: "Система", EN: "System" }[currentLocale]],
    [/^startDate$/i, { OZ: "Boshlanish sana", UZ: "Бошланиш сана", RU: "Дата начала", EN: "Start date" }[currentLocale]],
    [/^finishDate$/i, { OZ: "Yakunlanish sana", UZ: "Якунланиш сана", RU: "Дата окончания", EN: "Finish date" }[currentLocale]],
    [/^phoneExtension$/i, { OZ: "IP telefon raqami", UZ: "IP телефон рақами", RU: "IP телефон", EN: "IP phone extension" }[currentLocale]],
    [/^processStage$/i, { OZ: "Bosqich", UZ: "Босқич", RU: "Этап", EN: "Stage" }[currentLocale]],
    [/^confidentialityLevel$/i, { OZ: "Maxfiylik darajasi", UZ: "Махфийлик даражаси", RU: "Уровень конфиденциальности", EN: "Confidentiality level" }[currentLocale]],
    [/^builder\.verificationTriggerMode$/i, { OZ: "Tekshirish trigger holati", UZ: "Текшириш триггер ҳолати", RU: "Режим триггера проверки", EN: "Verification trigger mode" }[currentLocale]],
    [/^builder\.conditionViewMode$/i, { OZ: "Ko'rinish rejimi", UZ: "Кўриниш режими", RU: "Режим отображения", EN: "View mode" }[currentLocale]],
  ];

  for (const [pattern, label] of replacements) {
    if (pattern.test(fieldPath)) {
      return label;
    }
  }

  if (/^basisFile$/i.test(fieldPath)) {
    return {
      OZ: "Asos fayli",
      UZ: "\u0410\u0441\u043E\u0441 \u0444\u0430\u0439\u043B\u0438",
      RU: "\u0424\u0430\u0439\u043B-\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435",
      EN: "Basis file",
    }[currentLocale];
  }

  if (/^controlType$/i.test(fieldPath)) {
    return {
      OZ: "Nazorat turi",
      UZ: "\u041D\u0430\u0437\u043E\u0440\u0430\u0442 \u0442\u0443\u0440\u0438",
      RU: "\u0422\u0438\u043F \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044F",
      EN: "Control type",
    }[currentLocale];
  }

  if (/^responsibleDepartment$/i.test(fieldPath)) {
    return {
      OZ: "Mas'ul boshqarma",
      UZ: "\u041C\u0430\u0441\u044A\u0443\u043B \u0431\u043E\u0448\u049B\u0430\u0440\u043C\u0430",
      RU: "\u041E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435",
      EN: "Responsible department",
    }[currentLocale];
  }

  if (/^status$/i.test(fieldPath)) {
    return {
      OZ: "Status",
      UZ: "\u0421\u0442\u0430\u0442\u0443\u0441",
      RU: "\u0421\u0442\u0430\u0442\u0443\u0441",
      EN: "Status",
    }[currentLocale];
  }

  if (/^suspendedUntil$/i.test(fieldPath)) {
    return {
      OZ: "To'xtatish sanasi",
      UZ: "\u0422\u045E\u0445\u0442\u0430\u0442\u0438\u0448 \u0441\u0430\u043D\u0430\u0441\u0438",
      RU: "\u0414\u0430\u0442\u0430 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438",
      EN: "Suspended until",
    }[currentLocale];
  }

  if (/^priorityOrder$/i.test(fieldPath)) {
    return {
      OZ: "Ustuvorlik",
      UZ: "\u0423\u0441\u0442\u0443\u0432\u043E\u0440\u043B\u0438\u043A",
      RU: "\u041F\u0440\u0438\u043E\u0440\u0438\u0442\u0435\u0442",
      EN: "Priority",
    }[currentLocale];
  }

  if (/^smsNotificationEnabled$/i.test(fieldPath)) {
    return {
      OZ: "SMS xabarnoma",
      UZ: "SMS \u0445\u0430\u0431\u0430\u0440\u043D\u043E\u043C\u0430",
      RU: "SMS-\u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435",
      EN: "SMS notification",
    }[currentLocale];
  }

  if (/^smsPhones$/i.test(fieldPath)) {
    return {
      OZ: "SMS raqamlari",
      UZ: "SMS \u0440\u0430\u049B\u0430\u043C\u043B\u0430\u0440\u0438",
      RU: "SMS-\u043D\u043E\u043C\u0435\u0440\u0430",
      EN: "SMS phones",
    }[currentLocale];
  }

  if (/^deploymentScope$/i.test(fieldPath)) {
    return {
      OZ: "Qo'llanish doirasi",
      UZ: "\u049A\u045E\u043B\u043B\u0430\u043D\u0438\u0448 \u0434\u043E\u0438\u0440\u0430\u0441\u0438",
      RU: "\u041E\u0431\u043B\u0430\u0441\u0442\u044C \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F",
      EN: "Deployment scope",
    }[currentLocale];
  }

  if (/^directionType$/i.test(fieldPath)) {
    return {
      OZ: "Yo'nalish turi",
      UZ: "\u040E\u043D\u0430\u043B\u0438\u0448 \u0442\u0443\u0440\u0438",
      RU: "\u0422\u0438\u043F \u043D\u0430\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
      EN: "Direction type",
    }[currentLocale];
  }

  if (/^versionNumber$/i.test(fieldPath)) {
    return {
      OZ: "Versiya",
      UZ: "\u0412\u0435\u0440\u0441\u0438\u044F",
      RU: "\u0412\u0435\u0440\u0441\u0438\u044F",
      EN: "Version",
    }[currentLocale];
  }

  if (/^timeoutMs$/i.test(fieldPath)) {
    return "Timeout";
  }

  if (/^lastExecutionDurationMs$/i.test(fieldPath)) {
    return {
      OZ: "Oxirgi bajarilish vaqti",
      UZ: "\u041E\u0445\u0438\u0440\u0433\u0438 \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u0438\u0448 \u0432\u0430\u049B\u0442\u0438",
      RU: "\u0412\u0440\u0435\u043C\u044F \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0433\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F",
      EN: "Last execution duration",
    }[currentLocale];
  }

  if (/^territories$/i.test(fieldPath)) {
    return {
      OZ: "Hududlar",
      UZ: "\u04B2\u0443\u0434\u0443\u0434\u043B\u0430\u0440",
      RU: "\u0422\u0435\u0440\u0440\u0438\u0442\u043E\u0440\u0438\u0438",
      EN: "Territories",
    }[currentLocale];
  }

  if (/^posts$/i.test(fieldPath)) {
    return {
      OZ: "Postlar",
      UZ: "\u041F\u043E\u0441\u0442\u043B\u0430\u0440",
      RU: "\u041F\u043E\u0441\u0442\u044B",
      EN: "Posts",
    }[currentLocale];
  }

  if (/^autoCancelAfterDays$/i.test(fieldPath)) {
    return {
      OZ: "Avto bekor qilish kuni",
      UZ: "\u0410\u0432\u0442\u043E \u0431\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448 \u043A\u0443\u043D\u0438",
      RU: "\u0421\u0440\u043E\u043A \u0430\u0432\u0442\u043E\u043E\u0442\u043C\u0435\u043D\u044B",
      EN: "Auto cancel days",
    }[currentLocale];
  }

  if (/^conflictMonitoringEnabled$/i.test(fieldPath)) {
    return {
      OZ: "Konflikt monitoringi",
      UZ: "\u041A\u043E\u043D\u0444\u043B\u0438\u043A\u0442 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433\u0438",
      RU: "\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u043A\u043E\u043D\u0444\u043B\u0438\u043A\u0442\u043E\u0432",
      EN: "Conflict monitoring",
    }[currentLocale];
  }

  if (/^copiedFromControlId$/i.test(fieldPath)) {
    return {
      OZ: "Asl nazorat",
      UZ: "\u0410\u0441\u043B \u043D\u0430\u0437\u043E\u0440\u0430\u0442",
      RU: "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C",
      EN: "Source control",
    }[currentLocale];
  }

  if (/^approverDepartments$/i.test(fieldPath)) {
    return {
      OZ: "Kelishiladigan boshqarmalar",
      UZ: "\u041A\u0435\u043B\u0438\u0448\u0438\u043B\u0430\u0434\u0438\u0433\u0430\u043D \u0431\u043E\u0448\u049B\u0430\u0440\u043C\u0430\u043B\u0430\u0440",
      RU: "\u0421\u043E\u0433\u043B\u0430\u0441\u0443\u044E\u0449\u0438\u0435 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F",
      EN: "Approver departments",
    }[currentLocale];
  }

  const conditionSqlMatch = /^conditions\[(\d+)\]\.sqlQuery$/i.exec(fieldPath);
  if (conditionSqlMatch) {
    return {
      OZ: `${conditionSqlMatch[1]}-shart SQL so'rovi`,
      UZ: `${conditionSqlMatch[1]}-\u0448\u0430\u0440\u0442 SQL \u0441\u045E\u0440\u043E\u0432\u0438`,
      RU: `SQL-\u0437\u0430\u043F\u0440\u043E\u0441 \u0443\u0441\u043B\u043E\u0432\u0438\u044F ${conditionSqlMatch[1]}`,
      EN: `Condition SQL query #${conditionSqlMatch[1]}`,
    }[currentLocale];
  }

  const conditionServerMatch = /^conditions\[(\d+)\]\.serverName$/i.exec(fieldPath);
  if (conditionServerMatch) {
    return {
      OZ: `${conditionServerMatch[1]}-shart serveri`,
      UZ: `${conditionServerMatch[1]}-\u0448\u0430\u0440\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0438`,
      RU: `\u0421\u0435\u0440\u0432\u0435\u0440 \u0443\u0441\u043B\u043E\u0432\u0438\u044F ${conditionServerMatch[1]}`,
      EN: `Condition server #${conditionServerMatch[1]}`,
    }[currentLocale];
  }

  const verificationFieldMatch = /^verificationRules\[(\d+)\]\.(fieldRef|operator|comparisonValue|secondaryComparisonValue|tableName|fieldSource|joiner)$/i.exec(fieldPath);
  if (verificationFieldMatch) {
    const index = verificationFieldMatch[1];
    const part = verificationFieldMatch[2].toLowerCase();
    const partLabels: Record<string, Record<LocaleCode, string>> = {
      fieldref: { OZ: "parametri", UZ: "\u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u0438", RU: "\u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440", EN: "field" },
      operator: { OZ: "operatori", UZ: "\u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0438", RU: "\u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440", EN: "operator" },
      comparisonvalue: { OZ: "qiymati", UZ: "\u049B\u0438\u0439\u043C\u0430\u0442\u0438", RU: "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", EN: "value" },
      secondarycomparisonvalue: { OZ: "2-qiymati", UZ: "2-\u049B\u0438\u0439\u043C\u0430\u0442\u0438", RU: "2-\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", EN: "value 2" },
      tablename: { OZ: "jadvali", UZ: "\u0436\u0430\u0434\u0432\u0430\u043B\u0438", RU: "\u0442\u0430\u0431\u043B\u0438\u0446\u0430", EN: "table" },
      fieldsource: { OZ: "manbasi", UZ: "\u043C\u0430\u043D\u0431\u0430\u0441\u0438", RU: "\u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A", EN: "source" },
      joiner: { OZ: "bog'lanishi", UZ: "\u0431\u043E\u0493\u043B\u0430\u043D\u0438\u0448\u0438", RU: "\u0441\u0432\u044F\u0437\u043A\u0430", EN: "joiner" },
    };

    return {
      OZ: `Tekshirish sharti ${index} ${partLabels[part][currentLocale]}`,
      UZ: `\u0422\u0435\u043A\u0448\u0438\u0440\u0438\u0448 \u0448\u0430\u0440\u0442\u0438 ${index} ${partLabels[part][currentLocale]}`,
      RU: `\u0423\u0441\u043B\u043E\u0432\u0438\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 ${index}: ${partLabels[part][currentLocale]}`,
      EN: `Verification rule ${index} ${partLabels[part][currentLocale]}`,
    }[currentLocale];
  }

  return fieldPath
    .replace(/conditions\[(\d+)\]\.sqlQuery/gi, (_, index) => `SQL query #${index}`)
    .replace(/conditions\[(\d+)\]\.serverName/gi, (_, index) => `Server #${index}`)
    .replace(/verificationRules\[(\d+)\]\.fieldRef/gi, (_, index) => `Verification field #${index}`)
    .replace(/verificationRules\[(\d+)\]\.operator/gi, (_, index) => `Verification operator #${index}`)
    .replace(/verificationRules\[(\d+)\]\.comparisonValue/gi, (_, index) => `Verification value #${index}`)
    .replace(/verificationRules\[(\d+)\]\.secondaryComparisonValue/gi, (_, index) => `Verification value 2 #${index}`);
}

function formatFieldChangeTimestamp(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

function formatDateOnlyValue(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function formatFieldChangeValue(value: string | null | undefined) {
  if (!value) {
    return value;
  }

  return value
    .split("\n")
    .map((line) =>
      line.replace(
        /^(\s*\d+\.\s*)?(\d{4})-(\d{2})-(\d{2})$/,
        (_, prefix = "", year, month, day) => `${prefix}${formatDateOnlyValue(`${year}-${month}-${day}`)}`,
      ),
    )
    .join("\n");
}

function formatFieldChangeDisplayValue(fieldPath: string, value: string | null | undefined, currentLocale: LocaleCode) {
  if (!value) {
    return value;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^basisFile$/i.test(fieldPath)) {
    return trimmedValue.split("||")[0] ?? trimmedValue;
  }

  const localizedValueMaps: Record<string, Record<string, Record<LocaleCode, string>>> = {
    confidentialityLevel: {
      CONFIDENTIAL: { OZ: "Maxfiy", UZ: "\u041C\u0430\u0445\u0444\u0438\u0439", RU: "\u041A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E", EN: "Confidential" },
      NON_CONFIDENTIAL: { OZ: "Maxfiy emas", UZ: "\u041C\u0430\u0445\u0444\u0438\u0439 \u044D\u043C\u0430\u0441", RU: "\u041D\u0435 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E", EN: "Non-confidential" },
    },
    controlType: {
      WARNING: { OZ: "Ogohlantirish", UZ: "\u041E\u0433\u043E\u04B3\u043B\u0430\u043D\u0442\u0438\u0440\u0438\u0448", RU: "\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435", EN: "Warning" },
      BLOCK: { OZ: "Taqiqlash", UZ: "\u0422\u0430\u049B\u0438\u049B\u043B\u0430\u0448", RU: "\u0417\u0430\u043F\u0440\u0435\u0442", EN: "Block" },
      ALLOW: { OZ: "Istisno", UZ: "\u0418\u0441\u0442\u0438\u0441\u043D\u043E", RU: "\u0418\u0441\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435", EN: "Allow" },
    },
    deploymentScope: {
      INTERNAL: { OZ: "Ichki", UZ: "\u0418\u0447\u043A\u0438", RU: "\u0412\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u044F\u044F", EN: "Internal" },
      EXTERNAL: { OZ: "Tashqi", UZ: "\u0422\u0430\u0448\u049B\u0438", RU: "\u0412\u043D\u0435\u0448\u043D\u044F\u044F", EN: "External" },
      HYBRID: { OZ: "Aralash", UZ: "\u0410\u0440\u0430\u043B\u0430\u0448", RU: "\u0421\u043C\u0435\u0448\u0430\u043D\u043D\u0430\u044F", EN: "Hybrid" },
    },
    directionType: {
      ENTRY: { OZ: "Kirish", UZ: "\u041A\u0438\u0440\u0438\u0448", RU: "\u0412\u0445\u043E\u0434", EN: "Entry" },
      EXIT: { OZ: "Chiqish", UZ: "\u0427\u0438\u049B\u0438\u0448", RU: "\u0412\u044B\u0445\u043E\u0434", EN: "Exit" },
    },
    status: {
      ACTIVE: { OZ: "Faol", UZ: "\u0424\u0430\u043E\u043B", RU: "\u0410\u043A\u0442\u0438\u0432\u0435\u043D", EN: "Active" },
      CANCELLED: { OZ: "Bekor qilingan", UZ: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u043D\u0433\u0430\u043D", RU: "\u041E\u0442\u043C\u0435\u043D\u0451\u043D", EN: "Cancelled" },
      SUSPENDED: { OZ: "To'xtatilgan", UZ: "\u0422\u045E\u0445\u0442\u0430\u0442\u0438\u043B\u0433\u0430\u043D", RU: "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D", EN: "Suspended" },
    },
    "builder.conditionViewMode": {
      COMPLEX: { OZ: "Murakkab", UZ: "\u041C\u0443\u0440\u0430\u043A\u043A\u0430\u0431", RU: "\u0421\u043B\u043E\u0436\u043D\u044B\u0439", EN: "Complex" },
      SIMPLE: { OZ: "Sodda", UZ: "\u0421\u043E\u0434\u0434\u0430", RU: "\u041F\u0440\u043E\u0441\u0442\u043E\u0439", EN: "Simple" },
    },
    "builder.verificationTriggerMode": {
      TRUE: { OZ: "Rost", UZ: "\u0420\u043E\u0441\u0442", RU: "\u0418\u0441\u0442\u0438\u043D\u0430", EN: "True" },
      FALSE: { OZ: "Yolg'on", UZ: "\u0401\u043B\u0493\u043E\u043D", RU: "\u041B\u043E\u0436\u044C", EN: "False" },
    },
    smsNotificationEnabled: {
      true: { OZ: "Yoqilgan", UZ: "\u0401\u049B\u0438\u043B\u0433\u0430\u043D", RU: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E", EN: "Enabled" },
      false: { OZ: "O'chirilgan", UZ: "\u040E\u0447\u0438\u0440\u0438\u043B\u0433\u0430\u043D", RU: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u043E", EN: "Disabled" },
    },
    conflictMonitoringEnabled: {
      true: { OZ: "Yoqilgan", UZ: "\u0401\u049B\u0438\u043B\u0433\u0430\u043D", RU: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E", EN: "Enabled" },
      false: { OZ: "O'chirilgan", UZ: "\u040E\u0447\u0438\u0440\u0438\u043B\u0433\u0430\u043D", RU: "\u041E\u0442\u043A\u043B\u044E\u0447\u0435\u043D\u043E", EN: "Disabled" },
    },
  };

  const localizedMap = localizedValueMaps[fieldPath];
  if (localizedMap) {
    return localizedMap[trimmedValue]?.[currentLocale] ?? localizedMap[trimmedValue.toLowerCase()]?.[currentLocale] ?? trimmedValue;
  }

  return formatFieldChangeValue(value);
}

type FieldChangeAction = "added" | "updated" | "deleted";

function resolveFieldChangeAction(item: FieldChangeItem): FieldChangeAction {
  const hasOldValue = Boolean(item.oldValue?.trim());
  const hasNewValue = Boolean(item.newValue?.trim());

  if (!hasOldValue && hasNewValue) {
    return "added";
  }
  if (hasOldValue && !hasNewValue) {
    return "deleted";
  }
  return "updated";
}

function formatFieldChangeAction(action: FieldChangeAction, currentLocale: LocaleCode) {
  const localizedLabels: Record<LocaleCode, Record<FieldChangeAction, string>> = {
    OZ: {
      added: "Qo'shildi",
      updated: "O'zgartirildi",
      deleted: "O'chirildi",
    },
    UZ: {
      added: "\u049A\u045E\u0448\u0438\u043B\u0434\u0438",
      updated: "\u040E\u0437\u0433\u0430\u0440\u0442\u0438\u0440\u0438\u043B\u0434\u0438",
      deleted: "\u040E\u0447\u0438\u0440\u0438\u043B\u0434\u0438",
    },
    RU: {
      added: "\u0414\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u043E",
      updated: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u043E",
      deleted: "\u0423\u0434\u0430\u043B\u0435\u043D\u043E",
    },
    EN: {
      added: "Added",
      updated: "Updated",
      deleted: "Deleted",
    },
  };

  return localizedLabels[currentLocale][action];
}

function formatFieldChangeActionHeader(currentLocale: LocaleCode) {
  return {
    OZ: "Amal",
    UZ: "\u0410\u043C\u0430\u043B",
    RU: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435",
    EN: "Action",
  }[currentLocale];
}

function getFieldChangeActionClassName(action: FieldChangeAction) {
  switch (action) {
    case "added":
      return "text-emerald-700 dark:text-emerald-300";
    case "deleted":
      return "text-rose-700 dark:text-rose-300";
    default:
      return "text-amber-700 dark:text-amber-300";
  }
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const items: Array<number | "ellipsis"> = [];
  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  });

  return items;
}

function isDateRangeValid(startDate: string | null, finishDate: string | null) {
  if (!startDate || !finishDate) {
    return true;
  }

  return startDate < finishDate;
}

function shiftIsoDate(date: string | null, days: number) {
  if (!date) {
    return undefined;
  }

  const normalized = new Date(`${date}T00:00:00`);
  if (Number.isNaN(normalized.getTime())) {
    return undefined;
  }

  normalized.setDate(normalized.getDate() + days);
  return normalized.toISOString().slice(0, 10);
}

function isPdfFile(file: File) {
  const normalizedName = file.name.trim().toLocaleLowerCase();
  return file.type === "application/pdf" || normalizedName.endsWith(".pdf");
}

function areCanvasStatesEqual(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

type BuilderConditionDraft = {
  id: string;
  orderNumber: number;
  serverName: string;
  sqlQuery: string;
};

type BuilderVerificationRuleDraft = {
  id: string;
  sortOrder: number;
  fieldSource: "PARAMS" | "TABLE";
  tableName: string;
  fieldRef: string;
  operator: string;
  comparisonValue: string;
  secondaryComparisonValue: string;
};

type BuilderConditionMode = "complex" | "simple";

const BUILDER_CONDITION_MODE_KEY = "conditionViewMode";

function normalizeBuilderConditions(canvas: Record<string, unknown>) {
  const rawConditions = Array.isArray(canvas.complexConditions) ? canvas.complexConditions : [];
  return rawConditions.map<BuilderConditionDraft>((item, index) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return {
      id: String(raw.id ?? `condition-${index + 1}`),
      orderNumber: index + 1,
      serverName: String(raw.serverName ?? "").trim(),
      sqlQuery: String(raw.sqlQuery ?? "").trim(),
    };
  });
}

function normalizeBuilderVerificationRules(canvas: Record<string, unknown>, selectedTableName: string) {
  const rawRules = Array.isArray(canvas.verificationRules) ? canvas.verificationRules : [];
  return rawRules.map<BuilderVerificationRuleDraft>((item, index) => {
    const raw = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    const fieldSource = String(raw.fieldSource ?? "").toUpperCase() === "TABLE" ? "TABLE" : "PARAMS";
    return {
      id: String(raw.id ?? `verification-rule-${index + 1}`),
      sortOrder: index + 1,
      fieldSource,
      tableName: fieldSource === "TABLE" ? String(raw.tableName ?? selectedTableName ?? "").trim() : "",
      fieldRef: String(raw.fieldRef ?? "").trim(),
      operator: String(raw.operator ?? "EQ").trim().toUpperCase(),
      comparisonValue: String(raw.comparisonValue ?? "").trim(),
      secondaryComparisonValue: String(raw.secondaryComparisonValue ?? "").trim(),
    };
  });
}

function hasStructuredBuilderCanvas(canvas: Record<string, unknown>) {
  return "complexConditions" in canvas
    || "verificationRules" in canvas
    || "verificationTriggerMode" in canvas
    || BUILDER_CONDITION_MODE_KEY in canvas;
}

function resolveBuilderConditionMode(canvas: Record<string, unknown>): BuilderConditionMode {
  return String(canvas[BUILDER_CONDITION_MODE_KEY] ?? "").toLowerCase() === "simple" ? "simple" : "complex";
}

function BuilderConditionModeSwitch({
  value,
  onChange,
  disabled = false,
}: {
  value: BuilderConditionMode;
  onChange: (value: BuilderConditionMode) => void;
  disabled?: boolean;
}) {
  const isSimple = value === "simple";

  return (
    <div
      className={cn(
        "relative inline-grid h-7 w-[182px] grid-cols-2 items-center gap-0.5 rounded-[10px] border border-border/70 bg-background/88 p-0.5 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)]",
        disabled && "pointer-events-none opacity-60",
      )}
      role="group"
      aria-label="Builder view mode"
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-3px)] rounded-[8px] border border-border/60 bg-muted/90 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.35)] transition-transform duration-200",
          isSimple && "translate-x-[calc(100%+3px)]",
        )}
      />
      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex h-6 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          !isSimple && "text-primary",
        )}
        aria-pressed={!isSimple}
        aria-label="Murakkab"
        onClick={() => onChange("complex")}
      >
        <Braces className="size-3.5" />
        Murakkab
      </button>
      <button
        type="button"
        className={cn(
          "relative z-10 inline-flex h-6 items-center justify-center gap-1.5 rounded-[8px] px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          isSimple && "text-primary",
        )}
        aria-pressed={isSimple}
        aria-label="Sodda ko'rinish"
        onClick={() => onChange("simple")}
      >
        <Database className="size-3.5" />
        Sodda
      </button>
    </div>
  );
}

const REQUIRED_WARNING_MESSAGE_LOCALES = ["UZ", "OZ", "RU", "EN"] as const;
function validateStructuredBuilderCanvas(
  canvas: Record<string, unknown>,
  selectedTableName: string,
  messages: Partial<Record<(typeof REQUIRED_WARNING_MESSAGE_LOCALES)[number], string>>,
  phoneExtension: string | null | undefined,
  locale: LocaleCode,
): {
  message: string;
  errors: RuleCanvasComplexValidationErrors;
} | null {
  if (!hasStructuredBuilderCanvas(canvas)) {
    return null;
  }

  const errors: RuleCanvasComplexValidationErrors = {
    conditionErrorsById: {},
    verificationRuleErrorsById: {},
  };
  let firstMessage: string | null = null;
  const setFirstMessage = (message: string) => {
    if (!firstMessage) {
      firstMessage = message;
    }
  };
  const validationCopy = CONTROL_EDITOR_COPY[locale].builderValidation;
  const warningMessageLabels = CONTROL_EDITOR_LANGUAGE_LABELS[locale];
  const conditionMode = resolveBuilderConditionMode(canvas);

  const conditions = normalizeBuilderConditions(canvas);
  if (conditionMode === "complex") {
    if (conditions.length === 0) {
      errors.hasConditionsError = true;
      setFirstMessage(validationCopy.firstConditionRequired);
    }

    for (const condition of conditions) {
      const conditionLabel = validationCopy.conditionLabel(condition.orderNumber);
      if (!condition.serverName) {
        errors.conditionErrorsById![condition.id] = {
          ...errors.conditionErrorsById![condition.id],
          serverName: true,
        };
        errors.hasConditionsError = true;
        setFirstMessage(validationCopy.serverRequired(conditionLabel));
      }
      if (!condition.sqlQuery) {
        errors.conditionErrorsById![condition.id] = {
          ...errors.conditionErrorsById![condition.id],
          sqlQuery: true,
        };
        errors.hasConditionsError = true;
        setFirstMessage(validationCopy.sqlRequired(conditionLabel));
      }
    }
  }

  const verificationRules = normalizeBuilderVerificationRules(canvas, selectedTableName);
  if (verificationRules.length === 0) {
    errors.hasVerificationError = true;
    setFirstMessage(validationCopy.verificationRequired);
  }

  for (const rule of verificationRules) {
    const ruleLabel = validationCopy.verificationRuleLabel(rule.sortOrder);
    if (rule.fieldSource === "TABLE" && !rule.tableName) {
      errors.verificationRuleErrorsById![rule.id] = {
        ...errors.verificationRuleErrorsById![rule.id],
        tableName: true,
      };
      errors.hasVerificationError = true;
      setFirstMessage(validationCopy.tableRequired(ruleLabel));
    }
    if (!rule.fieldRef) {
      errors.verificationRuleErrorsById![rule.id] = {
        ...errors.verificationRuleErrorsById![rule.id],
        fieldRef: true,
      };
      errors.hasVerificationError = true;
      setFirstMessage(validationCopy.fieldRequired(ruleLabel));
    }
    if (rule.operator === "BETWEEN") {
      if (!rule.comparisonValue || !rule.secondaryComparisonValue) {
        errors.verificationRuleErrorsById![rule.id] = {
          ...errors.verificationRuleErrorsById![rule.id],
          comparisonValue: !rule.comparisonValue,
          secondaryComparisonValue: !rule.secondaryComparisonValue,
        };
        errors.hasVerificationError = true;
        setFirstMessage(validationCopy.rangeRequired(ruleLabel));
      }
      continue;
    }
    if (rule.operator !== "IS_NULL" && rule.operator !== "IS_NOT_NULL" && !rule.comparisonValue) {
      errors.verificationRuleErrorsById![rule.id] = {
        ...errors.verificationRuleErrorsById![rule.id],
        comparisonValue: true,
      };
      errors.hasVerificationError = true;
      setFirstMessage(validationCopy.valueRequired(ruleLabel));
    }
  }

  REQUIRED_WARNING_MESSAGE_LOCALES.forEach((localeCode) => {
    if ((messages[localeCode] ?? "").trim().length > 0) {
      return;
    }

    errors.warningMessageErrorsByLocale = {
      ...errors.warningMessageErrorsByLocale,
      [localeCode]: true,
    };
    errors.hasWarningMessagesError = true;
    setFirstMessage(validationCopy.warningRequired(warningMessageLabels[localeCode]));
  });

  if (String(phoneExtension ?? "").trim().length === 0) {
    errors.phoneExtension = true;
    errors.hasWarningMessagesError = true;
    setFirstMessage(validationCopy.phoneRequired);
  }

  return firstMessage ? { message: firstMessage, errors } : null;
}

type EditorStep = (typeof stepIds)[number];
type BuilderViewMode = "constructor" | "standard";

export function ControlEditorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const routeControlId = params.id ?? null;
  const [currentStep, setCurrentStep] = useState<EditorStep>("overview");
  const [isBuilderExpanded, setIsBuilderExpanded] = useState(false);
  const [builderViewMode, setBuilderViewMode] = useState<BuilderViewMode>("standard");
  const [persistedControlId, setPersistedControlId] = useState<string | null>(routeControlId);
  const [areComplexSectionsCollapsed, setAreComplexSectionsCollapsed] = useState(false);
  const [builderValidationErrors, setBuilderValidationErrors] = useState<RuleCanvasComplexValidationErrors | null>(null);
  const [isFieldChangeHistoryOpen, setIsFieldChangeHistoryOpen] = useState(false);
  const complexEditorRef = useRef<RuleCanvasComplexEditorHandle | null>(null);
  const currentLocale = resolveCurrentLocale(i18n.language);
  const editorCopy = CONTROL_EDITOR_COPY[currentLocale];
  const overviewValidationCopy = OVERVIEW_VALIDATION_COPY[currentLocale];
  const statusHistoryCopy = CONTROL_STATUS_HISTORY_COPY[currentLocale];

  const form = useForm<ControlRequest>({
    defaultValues: createDefaultControlRequest(),
  });
  const dateRangeMessage = overviewValidationCopy.dateRange;
  const pdfOnlyMessage = overviewValidationCopy.basisFilePdfOnly;
  const requiredMessages = {
    deploymentScope: overviewValidationCopy.deploymentScopeRequired,
    directionType: overviewValidationCopy.directionTypeRequired,
    systemName: overviewValidationCopy.systemNameRequired,
    controlType: overviewValidationCopy.controlTypeRequired,
    name: overviewValidationCopy.nameRequired,
    processStage: overviewValidationCopy.processStageRequired,
    tableName: overviewValidationCopy.tableNameRequired,
    objective: overviewValidationCopy.objectiveRequired,
    startDate: overviewValidationCopy.startDateRequired,
    finishDate: overviewValidationCopy.finishDateRequired,
  } satisfies Partial<Record<keyof ControlRequest, string>>;

  useEffect(() => {
    setPersistedControlId(routeControlId);
  }, [routeControlId]);

  const detailQuery = useQuery({
    queryKey: ["control", persistedControlId],
    queryFn: () => fetchControl(persistedControlId!),
    enabled: Boolean(persistedControlId),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const nextUniqueNumberQuery = useQuery({
    queryKey: ["controls", "nextUniqueNumber"],
    queryFn: fetchNextControlUniqueNumber,
    enabled: !persistedControlId,
    staleTime: 0,
  });
  const processStagesQuery = useQuery({
    queryKey: classifierQueryKeys.processStages,
    queryFn: getClassifierProcessStages,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const tablesQuery = useQuery({
    queryKey: classifierQueryKeys.tables,
    queryFn: getClassifierTables,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const systemTypesQuery = useQuery({
    queryKey: classifierQueryKeys.systemTypes,
    queryFn: getClassifierSystemTypes,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const departmentsQuery = useQuery({
    queryKey: classifierQueryKeys.departments,
    queryFn: getClassifierDepartments,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });
  const statesQuery = useQuery({
    queryKey: classifierQueryKeys.states(currentLocale),
    queryFn: () => getClassifierStates(currentLocale),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (detailQuery.data) {
      form.reset(controlDetailToRequest(detailQuery.data));
    }
  }, [detailQuery.data, form]);

  useEffect(() => {
    if (persistedControlId || form.getValues("uniqueNumber") || !nextUniqueNumberQuery.data?.uniqueNumber) {
      return;
    }

    form.setValue("uniqueNumber", nextUniqueNumberQuery.data.uniqueNumber, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  }, [form, nextUniqueNumberQuery.data?.uniqueNumber, persistedControlId]);

  useEffect(() => {
    const currentStage = form.getValues("processStage");
    const defaultProcessStageName = getDefaultProcessStageName(processStagesQuery.data ?? []);
    const resolvedStage = resolveProcessStageValue(currentStage) || defaultProcessStageName;

    if (resolvedStage && resolvedStage !== currentStage) {
      form.setValue("processStage", resolvedStage, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, processStagesQuery.data]);

  const watchDeploymentScope = form.watch("deploymentScope");
  const watchSystemName = form.watch("systemName");

  useEffect(() => {
    if (watchDeploymentScope === "INTERNAL") {
      if (!form.getValues("directionType")) {
        form.setValue("directionType", "ENTRY", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
      return;
    }

    if (form.getValues("directionType") !== null) {
      form.setValue("directionType", null, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [form, watchDeploymentScope]);

  const overviewAutosaveMutation = useMutation({
    mutationFn: async (payload: ControlOverviewRequest) =>
      persistedControlId ? updateControlOverview(persistedControlId, payload) : createControlOverview(payload),
    onSuccess: (result) => {
      const mergedResult = mergeAutosavedDetail(result, form.getValues());
      setPersistedControlId(result.id);
      queryClient.setQueryData(["control", result.id], mergedResult);
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      form.reset(controlDetailToRequest(mergedResult));
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error(t("editor.notifications.saveFailed"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ControlRequest) => {
      const wasUpdate = Boolean(persistedControlId);
      const normalizedPayload = {
        ...payload,
        code: payload.uniqueNumber.trim() || payload.code,
        phoneExtension: String(payload.phoneExtension ?? "").trim(),
      };

      const result = persistedControlId
        ? await updateControl(persistedControlId, normalizedPayload)
        : await createControl(normalizedPayload);

      return { result, wasUpdate };
    },
    onSuccess: ({ result, wasUpdate }) => {
      setPersistedControlId(result.id);
      queryClient.setQueryData(["control", result.id], result);
      void queryClient.invalidateQueries({ queryKey: ["controls"] });
      toast.success(
        wasUpdate
          ? t("editor.notifications.updated", { defaultValue: "Mantiqiy nazorat ma'lumotlari yangilandi" })
          : t("editor.notifications.created", { defaultValue: "Mantiqiy nazorat saqlandi" }),
      );
      startTransition(() => navigate(`/controls/${result.id}/edit`, { replace: true }));
    },
    onError: () => {
      toast.error(t("editor.notifications.saveFailed"));
    },
  });

  const watchSms = form.watch("smsNotificationEnabled");
  const watchUniqueNumber = form.watch("uniqueNumber");
  const watchProcessStage = form.watch("processStage");
  const watchTableName = form.watch("tableName");
  const watchApprovers = form.watch("approvers") ?? [];
  const watchApproverDepartmentIds = form.watch("approverDepartmentIds") ?? [];
  const watchConfidentiality = form.watch("confidentialityLevel");
  const watchRuleCanvas = form.watch("ruleBuilderCanvas");
  const watchControlName = form.watch("name");
  const watchMessages = form.watch("messages");
  const watchPhoneExtension = form.watch("phoneExtension");
  const builderContentHeightClassName = isBuilderExpanded ? "h-[calc(100vh-12rem)] min-h-0" : "h-[74vh] min-h-[680px]";
  const isComplexStandardMode = builderViewMode === "standard";
  const builderConditionMode = useMemo(() => resolveBuilderConditionMode(watchRuleCanvas), [watchRuleCanvas]);
  const isSimpleBuilderView = isComplexStandardMode && builderConditionMode === "simple";
  const complexStandardBuilderClassName = cn(builderContentHeightClassName, isComplexStandardMode && "pb-28");
  const watchBasisFileName = form.watch("basisFileName");
  const watchBasisFileSize = form.watch("basisFileSize");
  const watchBasisFileContentType = form.watch("basisFileContentType");
  const watchBasisFileBase64 = form.watch("basisFileBase64");
  const watchBasisFileRemoved = form.watch("basisFileRemoved");
  const watchStartDate = form.watch("startDate");
  const watchFinishDate = form.watch("finishDate");
  const watchHasStoredBasisFile = Boolean(detailQuery.data?.hasBasisFile) && !watchBasisFileRemoved && !watchBasisFileBase64;
  const controlTypeLabels = editorCopy.controlTypeLabels;
  const deploymentScopeLabels = editorCopy.deploymentScopeLabels;
  const directionTypeLabels = editorCopy.directionTypeLabels;
  const approverDepartmentCopy = APPROVER_DEPARTMENT_COPY[currentLocale];
  const currentStateLabels = useMemo(
    () => new Map((statesQuery.data ?? []).map((row) => [row.code.toUpperCase(), row.name])),
    [statesQuery.data],
  );
  const currentStateCode = detailQuery.data?.currentStateCode?.trim().toUpperCase() ?? null;
  const currentStateLabel = currentStateCode
    ? currentStateLabels.get(currentStateCode) ?? detailQuery.data?.currentStateName ?? currentStateCode
    : null;
  const fieldChangeLogs = detailQuery.data?.fieldChangeLogs ?? [];
  const approverDepartmentOptions = useMemo(
    () => buildApproverDepartmentOptions(departmentsQuery.data ?? [], watchApproverDepartmentIds),
    [departmentsQuery.data, watchApproverDepartmentIds],
  );
  const handleBuilderConditionModeChange = (mode: BuilderConditionMode) => {
    const currentCanvas = form.getValues("ruleBuilderCanvas");
    const currentVerificationRules = Array.isArray(currentCanvas.verificationRules) ? currentCanvas.verificationRules : [];
    const nextVerificationRules = mode === "simple"
      ? currentVerificationRules.map((item) => {
          const rule = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
          return {
            ...rule,
            fieldSource: "TABLE",
            tableName: String(rule.tableName ?? "").trim() || watchTableName || "",
          };
        })
      : currentVerificationRules;
    const nextCanvas = {
      ...currentCanvas,
      verificationRules: nextVerificationRules,
      [BUILDER_CONDITION_MODE_KEY]: mode,
    };
    form.setValue("ruleBuilderCanvas", nextCanvas, {
      shouldDirty: true,
      shouldTouch: false,
      shouldValidate: false,
    });
  };
  const selectedApproverDepartmentLabels = useMemo(() => {
    if (watchApproverDepartmentIds.length > 0) {
      const labelsById = new Map((departmentsQuery.data ?? []).map((row) => [row.id, row.name]));
      return watchApproverDepartmentIds.map(
        (departmentId, index) => labelsById.get(departmentId) ?? watchApprovers[index] ?? departmentId,
      );
    }
    return watchApprovers.filter((value) => value.trim().length > 0);
  }, [departmentsQuery.data, watchApproverDepartmentIds, watchApprovers]);
  const handleApproverDepartmentIdsChange = (nextDepartmentIds: string[]) => {
    const labelsById = new Map((departmentsQuery.data ?? []).map((row) => [row.id, row.name]));
    form.setValue("approverDepartmentIds", nextDepartmentIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
    form.setValue(
      "approvers",
      nextDepartmentIds.map((departmentId) => labelsById.get(departmentId) ?? departmentId),
      {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      },
    );
  };
  const availableProcessStageOptions = useMemo(
    () =>
      buildProcessStageOptions(
        processStagesQuery.data ?? [],
        resolveProcessStageValue(watchProcessStage) || watchProcessStage,
      ),
    [processStagesQuery.data, watchProcessStage],
  );
  const normalizedDeploymentScope: DeploymentScope =
    watchDeploymentScope === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
  const availableSystemNameOptions = useMemo(
    () => buildSystemNameOptions(systemTypesQuery.data ?? [], normalizedDeploymentScope, watchSystemName),
    [normalizedDeploymentScope, systemTypesQuery.data, watchSystemName],
  );
  const isDataEntryStage = resolveProcessStageValue(watchProcessStage) === "Ma'lumot kiritish";
  const availableTableOptions = useMemo(
    () => buildClassifierTableOptions(tablesQuery.data ?? [], watchSystemName, watchTableName),
    [tablesQuery.data, watchSystemName, watchTableName],
  );

  useEffect(() => {
    const currentSystemName = form.getValues("systemName");
    const defaultSystemName = getDefaultSystemName(systemTypesQuery.data ?? [], normalizedDeploymentScope);

    if (!currentSystemName && defaultSystemName) {
      form.setValue("systemName", defaultSystemName, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
      return;
    }

    if (currentSystemName && !availableSystemNameOptions.includes(currentSystemName) && defaultSystemName) {
      form.setValue("systemName", defaultSystemName, {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [availableSystemNameOptions, form, normalizedDeploymentScope, systemTypesQuery.data]);

  useEffect(() => {
    if (!isDataEntryStage) {
      if (form.getValues("tableName")) {
        form.setValue("tableName", "", {
          shouldDirty: false,
          shouldTouch: false,
          shouldValidate: false,
        });
      }
      return;
    }

    if (watchTableName && !availableTableOptions.includes(watchTableName)) {
      form.setValue("tableName", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [availableTableOptions, form, isDataEntryStage, watchTableName]);

  useEffect(() => {
    if (!watchStartDate && !watchFinishDate) {
      return;
    }

    void form.trigger(["startDate", "finishDate"]);
  }, [form, watchFinishDate, watchStartDate]);

  useEffect(() => {
    setIsBuilderExpanded(currentStep === "execution");
  }, [currentStep]);

  useEffect(() => {
    setBuilderValidationErrors((current) => {
      if (!current || builderViewMode !== "standard") {
        return current;
      }

      const validationResult = validateStructuredBuilderCanvas(watchRuleCanvas, watchTableName, watchMessages, watchPhoneExtension, currentLocale);
      return validationResult?.errors ?? null;
    });
  }, [builderViewMode, watchMessages, watchPhoneExtension, watchRuleCanvas, watchTableName]);

  const steps: Array<{ id: EditorStep; number: number; title: string }> = [
    {
      id: "overview",
      number: 1,
      title: t("editor.steps.overview.title"),
    },
    {
      id: "execution",
      number: 2,
      title: t("editor.steps.execution.title"),
    },
  ];
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const isLastStep = currentStepIndex === steps.length - 1;
  const isFirstStep = currentStepIndex === 0;
  const isTransitionPending = overviewAutosaveMutation.isPending || saveMutation.isPending;

  const handleStepChange = async (step: EditorStep) => {
    if (step === currentStep) {
      return;
    }

    if (currentStep === "overview" && step === "execution") {
      const fieldsToValidate: Array<keyof ControlRequest> =
        watchDeploymentScope === "INTERNAL"
          ? [...OVERVIEW_REQUIRED_FIELDS, "directionType"]
          : OVERVIEW_REQUIRED_FIELDS;
      const overviewFieldsToValidate: Array<keyof ControlRequest> =
        isDataEntryStage && availableTableOptions.length > 0
          ? [...fieldsToValidate, "tableName"]
          : fieldsToValidate;
      const isValid = await form.trigger(overviewFieldsToValidate, { shouldFocus: true });
      if (!isValid) {
        return;
      }

      try {
        await overviewAutosaveMutation.mutateAsync(buildOverviewRequest(form.getValues()));
      } catch {
        return;
      }
    }

    setCurrentStep(step);
  };

  const goToStep = (step: EditorStep) => {
    void handleStepChange(step);
  };
  const goToPreviousStep = () => {
    if (isFirstStep) {
      return;
    }

    setCurrentStep(steps[currentStepIndex - 1].id);
  };
  const goToNextStep = () => {
    if (isLastStep) {
      return;
    }

    void handleStepChange(steps[currentStepIndex + 1].id);
  };

  const downloadBasisFileMutation = useMutation({
    mutationFn: async () => {
      if (!persistedControlId) {
        throw new Error(editorCopy.missingControlId);
      }

      return downloadControlBasisFile(persistedControlId);
    },
    onSuccess: (blob) => {
      const fileName = watchBasisFileName || "mn-asosi";
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
    onError: () => {
      toast.error(editorCopy.basisFileDownloadFailed);
    },
  });

  const handleBasisFileSelected = async (file: File) => {
    if (!isPdfFile(file)) {
      toast.error(pdfOnlyMessage);
      return;
    }

    try {
      const base64 = await readFileAsBase64(file);
      form.setValue("basisFileName", file.name, { shouldDirty: true, shouldTouch: true, shouldValidate: false });
      form.setValue("basisFileContentType", file.type || "application/octet-stream", {
        shouldDirty: true,
        shouldTouch: false,
        shouldValidate: false,
      });
      form.setValue("basisFileSize", file.size, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
      form.setValue("basisFileBase64", base64, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
      form.setValue("basisFileRemoved", false, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    } catch {
      toast.error(editorCopy.basisFileReadFailed);
    }
  };

  const handleBasisFileRemove = () => {
    form.setValue("basisFileName", "", { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileContentType", "", { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileSize", null, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileBase64", null, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
    form.setValue("basisFileRemoved", true, { shouldDirty: true, shouldTouch: false, shouldValidate: false });
  };

  const submitControl = form.handleSubmit((values) => {
    if (builderViewMode === "standard") {
      const builderValidationResult = validateStructuredBuilderCanvas(
        values.ruleBuilderCanvas,
        values.tableName,
        values.messages,
        values.phoneExtension,
        currentLocale,
      );
      if (builderValidationResult) {
        setBuilderValidationErrors(builderValidationResult.errors);
        setCurrentStep("execution");
        toast.error(builderValidationResult.message);
        return;
      }
    }

    setBuilderValidationErrors(null);
    saveMutation.mutate(values);
  });
  const currentStatePalette = resolveStatePalette(currentStateCode);
  const statusSummary = currentStateCode ? (
    <div className="inline-flex max-w-full items-center gap-2.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="size-11 shrink-0 rounded-[16px] border-border/70 bg-background/88 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)]"
        onClick={() => setIsFieldChangeHistoryOpen(true)}
        disabled={!persistedControlId}
      >
        <History className="size-4" />
      </Button>
      <span className={cn("inline-flex size-2.5 shrink-0 rounded-full", currentStatePalette.dotClassName)} />
      <p className={cn("truncate text-sm font-semibold", currentStatePalette.textClassName)}>{currentStateLabel}</p>
    </div>
  ) : null;

  return (
    <div className="relative space-y-6">
      <form
        className="space-y-6 [&_input]:h-11 [&_input]:rounded-[14px] [&_input]:px-4 [&_input]:text-[15px] [&_textarea]:min-h-24 [&_textarea]:rounded-[16px] [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-[15px] [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-[14px] [&_[data-slot=select-trigger]]:px-4 [&_[data-slot=select-trigger]]:text-[15px]"
        onSubmit={submitControl}
      >
        <div className="flex flex-col gap-3 xl:relative xl:min-h-11 xl:justify-center">
          {statusSummary ? (
            <div className="xl:absolute xl:left-0 xl:top-1/2 xl:-translate-y-1/2">
              {statusSummary}
            </div>
          ) : null}
          <Tabs
            value={currentStep}
            onValueChange={(value) => goToStep(value as EditorStep)}
            className="items-center"
          >
            <TabsList className="relative mx-auto grid h-auto w-full max-w-xl grid-cols-2 gap-1.5 rounded-[20px] bg-[linear-gradient(180deg,rgba(218,226,237,0.98),rgba(205,214,226,0.88))] p-1 dark:bg-[linear-gradient(180deg,rgba(51,65,85,0.95),rgba(30,41,59,0.86))]">
              {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;

                return (
                  <TabsTrigger
                    key={step.id}
                    value={step.id}
                    disabled={isTransitionPending}
                    className={cn(
                      "relative z-10 flex h-auto min-h-[3.1rem] items-center justify-start gap-2.5 rounded-[16px] px-3.5 py-2 text-left data-[state=active]:shadow-none",
                      currentStep === step.id ? "bg-transparent" : "bg-white/26 hover:bg-white/34",
                    )}
                  >
                      <span
                        className={cn(
                        "inline-flex h-7 min-w-7 shrink-0 aspect-square items-center justify-center rounded-full border text-[11px] leading-none font-semibold transition-all duration-300",
                          currentStep === step.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : isCompleted
                            ? "border-primary/70 bg-primary/10 text-primary"
                            : "border-border/70 bg-background/90 text-muted-foreground",
                      )}
                    >
                      {step.number}
                    </span>
                    <span className="text-[0.92rem] font-semibold leading-none">
                      {step.title}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>

        {currentStep === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="overflow-visible border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle className="flex min-w-0 flex-wrap items-center gap-2.5">
                    <span className="shrink-0">{editorCopy.overviewTitlePrefix}</span>
                    <span className="shrink-0 text-primary">{watchUniqueNumber || "LC20260000001"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-12">
                  <Controller
                    control={form.control}
                    name="deploymentScope"
                    rules={{ required: requiredMessages.deploymentScope }}
                    render={({ field, fieldState }) => (
                      <Field label={editorCopy.systemTypeLabel} className="lg:col-span-3" error={fieldState.error?.message}>
                        <ChoiceCardRadioGroup
                          name={field.name}
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { value: "INTERNAL", label: deploymentScopeLabels.INTERNAL },
                            { value: "EXTERNAL", label: deploymentScopeLabels.EXTERNAL },
                          ]}
                        />
                      </Field>
                    )}
                  />
                  {watchDeploymentScope === "INTERNAL" ? (
                    <Controller
                      control={form.control}
                      name="directionType"
                      rules={{ required: requiredMessages.directionType }}
                      render={({ field, fieldState }) => (
                        <Field label={editorCopy.directionLabel} className="lg:col-span-3" error={fieldState.error?.message}>
                          <ChoiceCardRadioGroup
                            name={field.name}
                            value={field.value ?? ""}
                            onChange={(value) => field.onChange(value)}
                            options={[
                              { value: "ENTRY", label: directionTypeLabels.ENTRY },
                              { value: "EXIT", label: directionTypeLabels.EXIT },
                            ]}
                          />
                        </Field>
                      )}
                    />
                  ) : null}
                  <Controller
                    control={form.control}
                    name="systemName"
                    rules={{ required: requiredMessages.systemName }}
                    render={({ field, fieldState }) => (
                      <Field
                        label={editorCopy.systemNameLabel}
                        className={watchDeploymentScope === "INTERNAL" ? "lg:col-span-3" : "lg:col-span-5"}
                        error={fieldState.error?.message}
                      >
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={availableSystemNameOptions}
                          placeholder={
                            systemTypesQuery.isLoading ? editorCopy.loadingSystemNames : editorCopy.selectSystemName
                          }
                          disabled={systemTypesQuery.isLoading}
                          hasError={Boolean(fieldState.error)}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="controlType"
                    rules={{ required: requiredMessages.controlType }}
                    render={({ field, fieldState }) => (
                      <Field
                        label={editorCopy.controlTypeLabel}
                        className={watchDeploymentScope === "INTERNAL" ? "lg:col-span-3" : "lg:col-span-4"}
                        error={fieldState.error?.message}
                      >
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn("w-full", fieldState.error && "border-destructive focus-visible:ring-destructive/20")}>
                            <span className="truncate">{controlTypeLabels[field.value]}</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WARNING">{controlTypeLabels.WARNING}</SelectItem>
                            <SelectItem value="BLOCK">{controlTypeLabels.BLOCK}</SelectItem>
                            <SelectItem value="ALLOW">{controlTypeLabels.ALLOW}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  />
                  <Field
                    label={editorCopy.controlNameLabel}
                    className="lg:col-span-12"
                    error={form.formState.errors.name?.message}
                  >
                    <Input
                      {...form.register("name", { required: requiredMessages.name })}
                      className={form.formState.errors.name ? "border-destructive focus-visible:ring-destructive/20" : ""}
                    />
                  </Field>
                  <Controller
                    control={form.control}
                    name="processStage"
                    rules={{ required: requiredMessages.processStage }}
                    render={({ field, fieldState }) => (
                      <Field
                        label={editorCopy.processStageLabel}
                        className={isDataEntryStage ? "lg:col-span-4" : "lg:col-span-12"}
                        error={fieldState.error?.message}
                      >
                        <SearchableSelect
                          value={field.value}
                          onChange={field.onChange}
                          options={availableProcessStageOptions}
                          placeholder={
                            processStagesQuery.isLoading ? editorCopy.loadingProcessStages : editorCopy.selectProcessStage
                          }
                          disabled={processStagesQuery.isLoading}
                          hasError={Boolean(fieldState.error)}
                        />
                      </Field>
                    )}
                  />
                  {isDataEntryStage ? (
                    <Controller
                      control={form.control}
                      name="tableName"
                      rules={availableTableOptions.length > 0 ? { required: requiredMessages.tableName } : undefined}
                      render={({ field, fieldState }) => (
                        <Field label={editorCopy.tableLabel} className="lg:col-span-8" error={fieldState.error?.message}>
                          <SearchableSelect
                            value={field.value}
                            onChange={field.onChange}
                            options={availableTableOptions}
                            placeholder={
                              tablesQuery.isLoading
                                ? editorCopy.loadingTables
                                : availableTableOptions.length === 0
                                  ? editorCopy.noMatchingTable
                                  : editorCopy.selectTable
                            }
                            disabled={tablesQuery.isLoading || availableTableOptions.length === 0}
                            hasError={Boolean(fieldState.error)}
                          />
                        </Field>
                      )}
                    />
                  ) : null}
                  <Field
                    label={editorCopy.objectiveLabel}
                    className="lg:col-span-12"
                    error={form.formState.errors.objective?.message}
                  >
                    <Textarea
                      rows={5}
                      {...form.register("objective", { required: requiredMessages.objective })}
                      className={form.formState.errors.objective ? "border-destructive focus-visible:ring-destructive/20" : ""}
                    />
                  </Field>
                  <Field label={editorCopy.basisLabel} className="lg:col-span-12">
                    <Input {...form.register("basis")} />
                  </Field>
                  <Field label={editorCopy.basisFileLabel} className="lg:col-span-12">
                    <BasisFileDropzone
                      fileName={watchBasisFileName}
                      fileSize={watchBasisFileSize}
                      hasStoredFile={watchHasStoredBasisFile}
                      contentType={watchBasisFileContentType}
                      onFileSelect={handleBasisFileSelected}
                      onRemove={handleBasisFileRemove}
                      onDownload={watchHasStoredBasisFile ? () => downloadBasisFileMutation.mutate() : undefined}
                      downloading={downloadBasisFileMutation.isPending}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card className="overflow-visible border-border/70 bg-card/90">
                <CardHeader>
                  <CardTitle>{editorCopy.parametersTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Controller
                      control={form.control}
                      name="startDate"
                      rules={{
                        required: requiredMessages.startDate,
                        validate: (value) =>
                          isDateRangeValid(value, form.getValues("finishDate")) || dateRangeMessage,
                      }}
                      render={({ field, fieldState }) => (
                        <Field label={editorCopy.startDateLabel} error={fieldState.error?.message}>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            max={shiftIsoDate(watchFinishDate, -1)}
                            className={fieldState.error ? "border-destructive focus-visible:ring-destructive/20" : ""}
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="finishDate"
                      rules={{
                        required: requiredMessages.finishDate,
                        validate: (value) =>
                          isDateRangeValid(form.getValues("startDate"), value) || dateRangeMessage,
                      }}
                      render={({ field, fieldState }) => (
                        <Field label={editorCopy.finishDateLabel} error={fieldState.error?.message}>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                            min={shiftIsoDate(watchStartDate, 1)}
                            className={fieldState.error ? "border-destructive focus-visible:ring-destructive/20" : ""}
                          />
                        </Field>
                      )}
                    />
                  </div>

                  <Controller
                    control={form.control}
                    name="approverDepartmentIds"
                    render={({ field }) => (
                      <Field label={approverDepartmentCopy.label}>
                        <MultiSearchableSelect
                          value={field.value}
                          onChange={handleApproverDepartmentIdsChange}
                          options={approverDepartmentOptions}
                          placeholder={
                            departmentsQuery.isLoading
                              ? approverDepartmentCopy.loading
                              : approverDepartmentCopy.placeholder
                          }
                          searchPlaceholder={editorCopy.searchPlaceholder}
                          emptyLabel={editorCopy.noMatchingResult}
                          disabled={departmentsQuery.isLoading || approverDepartmentOptions.length === 0}
                        />
                        {selectedApproverDepartmentLabels.length > 0 ? (
                          <ol className="mt-3 space-y-2 rounded-[16px] border border-border/70 bg-muted/20 px-3 py-3">
                            {selectedApproverDepartmentLabels.map((label, index) => (
                              <li key={`${label}-${index}`} className="flex items-start gap-3 text-sm text-foreground">
                                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                  {index + 1}
                                </span>
                                <span className="pt-0.5 leading-5">{label}</span>
                              </li>
                            ))}
                          </ol>
                        ) : null}
                      </Field>
                    )}
                  />

                  <div className="space-y-4 rounded-[22px] border border-border/70 bg-background/80 p-4">
                    <Controller
                      control={form.control}
                      name="smsNotificationEnabled"
                      render={({ field }) => (
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{editorCopy.smsTitle}</p>
                            <p className="text-sm text-muted-foreground">
                              {editorCopy.smsDescription}
                            </p>
                          </div>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </div>
                      )}
                    />

                    {watchSms ? (
                      <Controller
                        control={form.control}
                        name="smsPhones"
                        render={({ field }) => (
                          <Field label={editorCopy.phonesLabel}>
                            <TagInput
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="+99890..."
                              addLabel={{
                                OZ: "Qo'shish",
                                UZ: "Қўшиш",
                                RU: "Добавить",
                                EN: "Add",
                              }[currentLocale]}
                            />
                          </Field>
                        )}
                      />
                    ) : null}
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 transition-all hover:border-primary/25 hover:bg-primary/4">
                    <input
                      type="checkbox"
                      checked={normalizeConfidentialityLevelKey(watchConfidentiality) === CONFIDENTIALITY_LEVEL_CONFIDENTIAL}
                      onChange={(event) =>
                        form.setValue(
                          "confidentialityLevel",
                          event.target.checked
                            ? CONFIDENTIALITY_LEVEL_CONFIDENTIAL
                            : CONFIDENTIALITY_LEVEL_NON_CONFIDENTIAL,
                          {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          },
                        )
                      }
                      className="mt-0.5 size-4 accent-[var(--primary)]"
                    />
                    <div>
                      <p className="font-medium text-foreground">{editorCopy.confidentialityTitle}</p>
                      <p className="text-sm text-muted-foreground">{editorCopy.confidentialityDescription}</p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            </div>
        ) : null}

        {currentStep === "execution" ? (
            <Card
              className={cn(
                "relative overflow-visible border-border/70 bg-card/90",
                isBuilderExpanded
                  ? "fixed inset-4 z-50 bg-background/96 shadow-[0_32px_90px_-28px_rgba(15,23,42,0.48)] backdrop-blur-xl"
                  : "",
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:items-center xl:gap-3">
                    <Tabs value={builderViewMode} onValueChange={(value) => setBuilderViewMode(value as BuilderViewMode)}>
                      <TabsList className="relative grid h-10 w-full max-w-[320px] grid-cols-2 gap-0.5 rounded-[18px] bg-muted/80 p-0.5">
                        <TabsTrigger type="button" value="standard" className="h-full">
                          {editorCopy.standardTab}
                        </TabsTrigger>
                        <TabsTrigger type="button" value="constructor" className="h-full">
                          {editorCopy.constructorTab}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <div className="inline-flex h-10 min-w-0 items-center self-start rounded-[18px] border border-border/70 bg-background/88 px-4 text-sm text-foreground shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)]">
                      <span className="max-w-[24rem] truncate font-medium">{watchControlName || editorCopy.controlNameFallback}</span>
                    </div>
                  </div>
                  {builderViewMode === "standard" ? <div className="hidden" aria-hidden="true" /> : null}
                </div>
                <div className="flex items-center gap-2">
                  {isComplexStandardMode ? (
                    <>
                      <BuilderConditionModeSwitch
                        value={builderConditionMode}
                        onChange={handleBuilderConditionModeChange}
                        disabled={isTransitionPending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isTransitionPending}
                        onClick={() => complexEditorRef.current?.toggleAllSectionsCollapsed()}
                      >
                        {areComplexSectionsCollapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                        {areComplexSectionsCollapsed ? editorCopy.openLabel : editorCopy.collapseLabel}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isTransitionPending || isSimpleBuilderView}
                        onClick={() => complexEditorRef.current?.addCondition()}
                      >
                        <Plus className="size-4" />
                        {editorCopy.addConditionLabel}
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isTransitionPending}
                    onClick={() => setIsBuilderExpanded((current) => !current)}
                  >
                    {isBuilderExpanded ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    {isBuilderExpanded ? editorCopy.minimizeLabel : editorCopy.maximizeLabel}
                  </Button>
                </div>
              </CardHeader>
              <CardContent
                className={cn(
                  "relative",
                  isBuilderExpanded ? "h-[calc(100vh-8.5rem)]" : "",
                )}
              >
                {builderViewMode === "constructor" ? (
                  <RuleCanvasEditor
                    canvas={watchRuleCanvas}
                    preferredSystemType={form.watch("systemName")}
                    rootLabel={watchControlName || editorCopy.controlNameFallback}
                    canvasHeightClassName={builderContentHeightClassName}
                    onCanvasChange={(ruleBuilderCanvas) =>
                      areCanvasStatesEqual(watchRuleCanvas, ruleBuilderCanvas)
                        ? undefined
                        : form.setValue("ruleBuilderCanvas", ruleBuilderCanvas, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          })
                    }
                  />
                ) : (
                  <RuleCanvasComplexEditor
                    ref={complexEditorRef}
                    canvas={watchRuleCanvas}
                    simpleView={builderConditionMode === "simple"}
                    messages={watchMessages}
                    phoneExtension={watchPhoneExtension}
                    selectedTableName={watchTableName}
                    preferredSystemType={watchSystemName}
                    validationErrors={builderValidationErrors}
                    onAllSectionsCollapsedChange={setAreComplexSectionsCollapsed}
                    onMessageChange={(locale, value) =>
                      form.setValue(
                        "messages",
                        {
                          ...form.getValues("messages"),
                          [locale]: value,
                        },
                        {
                          shouldDirty: true,
                          shouldTouch: false,
                          shouldValidate: false,
                        },
                      )
                    }
                    onPhoneExtensionChange={(value) =>
                      form.setValue("phoneExtension", value, {
                        shouldDirty: true,
                        shouldTouch: false,
                        shouldValidate: false,
                      })
                    }
                    className={complexStandardBuilderClassName}
                    onCanvasChange={(ruleBuilderCanvas) =>
                      areCanvasStatesEqual(watchRuleCanvas, ruleBuilderCanvas)
                        ? undefined
                        : form.setValue("ruleBuilderCanvas", ruleBuilderCanvas, {
                            shouldDirty: true,
                            shouldTouch: false,
                            shouldValidate: false,
                          })
                    }
                  />
                )}
                {isComplexStandardMode ? (
                <div className="pointer-events-none absolute right-10 bottom-1 z-10">
                    <Button
                      type="button"
                      disabled={isTransitionPending}
                      onClick={() => void submitControl()}
                      className="pointer-events-auto h-11 rounded-[15px] border border-emerald-600 bg-white px-4.5 text-[14px] font-semibold text-emerald-700 shadow-[0_16px_32px_-22px_rgba(5,150,105,0.42)] hover:bg-emerald-600 hover:text-white"
                    >
                      {isTransitionPending ? <LoaderCircle className="size-4.5 animate-spin" /> : <Save className="size-4.5" />}
                      {isTransitionPending ? t("common.saving") : t("common.save")}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
        ) : null}

        <section className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-card/80 px-5 py-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.22)] md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isLastStep ? t("editor.footer.lastStep") : t("editor.footer.nextAvailable")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLastStep
                ? t("editor.footer.lastStepDescription")
                : `${t("editor.footer.nextStep")}: ${steps[currentStepIndex + 1].title}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={goToPreviousStep} disabled={isFirstStep || isTransitionPending}>
              <ChevronLeft className="size-4" />
              {t("editor.actions.back")}
            </Button>
            {!isLastStep ? (
              <Button type="button" onClick={goToNextStep} disabled={isTransitionPending}>
                {t("editor.actions.next")}
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isTransitionPending}>
                {isTransitionPending ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </div>
        </section>
      </form>

      {isFieldChangeHistoryOpen ? (
        <FieldChangeHistoryModal
          currentLocale={currentLocale}
          copy={statusHistoryCopy}
          items={fieldChangeLogs}
          onClose={() => setIsFieldChangeHistoryOpen(false)}
        />
      ) : null}

      {isTransitionPending ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex min-w-[320px] items-center gap-3 rounded-[20px] border border-border/70 bg-background px-5 py-4 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.35)]">
            <LoaderCircle className="size-5 animate-spin text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">{editorCopy.savingTitle}</p>
              <p className="text-sm text-muted-foreground">{editorCopy.savingDescription}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FieldChangeHistoryModal({
  currentLocale,
  copy,
  items,
  onClose,
}: {
  currentLocale: LocaleCode;
  copy: (typeof CONTROL_STATUS_HISTORY_COPY)[LocaleCode];
  items: FieldChangeItem[];
  onClose: () => void;
}) {
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = items.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const pageItems = items.slice(pageStartIndex, pageStartIndex + pageSize);
  const paginationItems = buildPaginationItems(safeCurrentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [items]);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-background/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[96rem] overflow-hidden rounded-[28px] border border-border/70 bg-background shadow-[0_36px_100px_-34px_rgba(15,23,42,0.5)]">
        <div className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{copy.historyTitle}</h2>
          </div>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-border/70 bg-muted/15 px-6 text-center">
              <History className="size-8 text-muted-foreground" />
              <p className="text-base font-semibold text-foreground">{copy.historyEmptyTitle}</p>
            </div>
          ) : (
              <Table className="table-fixed border border-border/70">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 border-r border-border/70 text-center">{copy.order}</TableHead>
                    <TableHead className="w-48 border-r border-border/70 text-center">{copy.changedAt}</TableHead>
                    <TableHead className="w-64 border-r border-border/70 text-center">{copy.changedBy}</TableHead>
                    <TableHead className="w-72 border-r border-border/70 text-center">{copy.fieldName}</TableHead>
                    <TableHead className="border-r border-border/70 text-center">{copy.oldValue}</TableHead>
                    <TableHead className="border-r border-border/70 text-center">{copy.newValue}</TableHead>
                    <TableHead className="w-40 text-center">{formatFieldChangeActionHeader(currentLocale)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item, index) => {
                    const action = resolveFieldChangeAction(item);
                    return (
                      <TableRow key={item.id} className="align-top">
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-center text-sm font-medium text-muted-foreground">
                          {pageStartIndex + index + 1}
                        </TableCell>
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-sm text-foreground">
                          {formatFieldChangeTimestamp(item.changedAt)}
                        </TableCell>
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-sm text-foreground">
                          {item.actor}
                        </TableCell>
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-sm font-medium text-foreground">
                          {formatFieldPathForDisplay(item.fieldPath, currentLocale)}
                        </TableCell>
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-sm text-foreground">
                          <pre className="whitespace-pre-wrap break-words font-sans">
                            {formatFieldChangeDisplayValue(item.fieldPath, item.oldValue, currentLocale) ?? copy.noValue}
                          </pre>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal border-r border-border/70 text-sm text-foreground">
                          <pre className="whitespace-pre-wrap break-words font-sans">
                            {formatFieldChangeDisplayValue(item.fieldPath, item.newValue, currentLocale) ?? copy.noValue}
                          </pre>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal text-center text-sm font-semibold">
                          <span className={cn("inline-flex w-full items-center justify-center", getFieldChangeActionClassName(action))}>
                            {formatFieldChangeAction(action, currentLocale)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border/70 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === safeCurrentPage ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </Button>
              ),
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
              disabled={safeCurrentPage <= 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
              disabled={safeCurrentPage >= totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {copy.close}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-2 inline-flex">{label}</Label>
      {children}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function ChoiceCardRadioGroup({
  name,
  value,
  onChange,
  options,
  columnsClassName = "",
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  columnsClassName?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-8 gap-y-2 pt-1", columnsClassName)}>
      {options.map((option) => {
        const checked = value === option.value;

        return (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="size-4 accent-[var(--primary)]"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hasError = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const editorCopy = CONTROL_EDITOR_COPY[currentLocale];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const estimatedDropdownHeight = 390;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
      }
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setOpenUpward(false);
    }
  }, [open]);

  const filteredOptions = options.filter((option) => option.toLocaleLowerCase().includes(query.toLocaleLowerCase()));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[14px] border border-input bg-transparent px-4 text-left text-[15px] transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          hasError && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-input",
        )}
      >
        <span className={value ? "truncate text-foreground" : "truncate text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={editorCopy.searchPlaceholder}
              className="h-10 rounded-[12px] px-3"
            />
          </div>

          <div className="max-h-[19.5rem] overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="leading-6">{option}</span>
                  {value === option ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">{editorCopy.noMatchingResult}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MultiSearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  disabled = false,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  options: DepartmentAutocompleteOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selectedValueSet = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (open) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const estimatedDropdownHeight = 390;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < estimatedDropdownHeight && spaceAbove > spaceBelow);
      }
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setOpenUpward(false);
    }
  }, [open]);

  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const selectedCount = value.length;
  const triggerValue = selectedCount > 0
    ? {
        OZ: `${selectedCount} ta tanlandi`,
        UZ: `${selectedCount} та танланди`,
        RU: `Выбрано: ${selectedCount}`,
        EN: `Selected: ${selectedCount}`,
      }[currentLocale]
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen((current) => !current);
          }
        }}
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[14px] border border-input bg-transparent px-4 text-left text-[15px] transition-colors hover:border-primary/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground hover:border-input",
        )}
      >
        <span className={cn("truncate", selectedCount > 0 ? "text-foreground" : "text-muted-foreground")}>
          {triggerValue}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 z-40 w-full overflow-hidden rounded-[18px] border border-border/75 bg-popover shadow-[0_26px_46px_-28px_rgba(15,23,42,0.34)]",
            openUpward ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]",
          )}
        >
          <div className="border-b border-border/70 p-3">
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 rounded-[12px] px-3"
            />
          </div>

          <div className="max-h-[19.5rem] overflow-y-auto p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const checked = selectedValueSet.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      onChange(
                        checked
                          ? value.filter((selectedId) => selectedId !== option.id)
                          : [...value, option.id],
                      )
                    }
                    className="flex w-full items-start justify-between gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="leading-6">{option.label}</span>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border border-border",
                        checked && "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BasisFileDropzone({
  fileName,
  fileSize,
  contentType,
  hasStoredFile,
  onFileSelect,
  onRemove,
  onDownload,
  downloading = false,
}: {
  fileName: string;
  fileSize: number | null;
  contentType: string;
  hasStoredFile: boolean;
  onFileSelect: (file: File) => void | Promise<void>;
  onRemove: () => void;
  onDownload?: () => void;
  downloading?: boolean;
}) {
  const { i18n } = useTranslation();
  const currentLocale = resolveCurrentLocale(i18n.language);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    await onFileSelect(file);
  };

  const handleInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const hasFile = Boolean(fileName);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="application/pdf,.pdf"
        onChange={handleInputChange}
      />

      {!hasFile ? (
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "rounded-[20px] border border-dashed px-4 py-4 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border/70 bg-background/70",
        )}
      >
        <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <div className="flex flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-4.5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">
                {{
                  OZ: "Faylni bu yerga tashlang yoki tanlang",
                  UZ: "Файлни бу ерга ташланг ёки танланг",
                  RU: "Перетащите файл сюда или выберите его",
                  EN: "Drop the file here or choose it",
                }[currentLocale]}
              </p>
              <p className="text-xs text-muted-foreground">
                {{
                  OZ: "Faqat PDF fayl yuklashingiz mumkin.",
                  UZ: "Фақат PDF файл юклашингиз мумкин.",
                  RU: "Можно загружать только PDF-файлы.",
                  EN: "Only PDF files can be uploaded.",
                }[currentLocale]}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {{
              OZ: "Fayl tanlash",
              UZ: "Файл танлаш",
              RU: "Выбрать файл",
              EN: "Choose file",
            }[currentLocale]}
          </Button>
        </div>
      </div>
      ) : null}

      {hasFile ? (
        <div className="flex flex-col gap-2.5 rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {[formatFileSize(fileSize), hasStoredFile && !contentType
                  ? {
                      OZ: "Saqlangan fayl",
                      UZ: "Сақланган файл",
                      RU: "Сохранённый файл",
                      EN: "Stored file",
                    }[currentLocale]
                  : contentType]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasStoredFile && onDownload ? (
              <Button type="button" variant="outline" size="sm" onClick={onDownload} disabled={downloading}>
                <Download className="size-4" />
                {downloading
                  ? {
                      OZ: "Yuklanmoqda...",
                      UZ: "Юкланмоқда...",
                      RU: "Загрузка...",
                      EN: "Downloading...",
                    }[currentLocale]
                  : {
                      OZ: "Yuklab olish",
                      UZ: "Юклаб олиш",
                      RU: "Скачать",
                      EN: "Download",
                    }[currentLocale]}
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" />
              {{
                OZ: "Almashtirish",
                UZ: "Алмаштириш",
                RU: "Заменить",
                EN: "Replace",
              }[currentLocale]}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              <X className="size-4" />
              {{
                OZ: "Olib tashlash",
                UZ: "Олиб ташлаш",
                RU: "Удалить",
                EN: "Remove",
              }[currentLocale]}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatFileSize(size: number | null) {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Fayl ma'lumotini o'qib bo'lmadi"));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Faylni o'qishda xatolik"));
    reader.readAsDataURL(file);
  });
}


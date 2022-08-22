import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import { RiCloseCircleLine } from "react-icons/ri";
import clsx from "clsx";

import { IncidentDetailsRow } from "./IncidentDetailsRow";
import { Select } from "../Select";
import { IncidentPriority } from "../../constants/incident-priority";
import {
  IncidentCommandersOption,
  IncidentCommandersSingleValue,
  IncidentPriorityOption,
  IncidentPrioritySingleValue
} from "./select-components";
import { priorities } from "./data";
import {
  AddResponder,
  AddResponderFormValues,
  ResponderPropsKeyToLabelMap
} from "./AddResponder";
import {
  deleteResponder,
  getRespondersForTheIncident
} from "../../api/services/responder";
import { toastError, toastSuccess } from "../Toast/toast";
import { IconButton } from "../IconButton";
import { BsShareFill, BsTrash } from "react-icons/bs";
import { DeleteConfirmDialog } from "../DeleteConfirmDialog";
import { ResponderDetailsToolTip } from "./ResponderDetailsToolTip";
import { ResponderDetailsDialog } from "./ResponderDetailsDialog";
import { Icon } from "../Icon";
import { typeItems } from "../Incidents/data";
import { Dropdown } from "../Dropdown";

export const IncidentDetails = ({
  incident,
  className,
  updateStatusHandler,
  updateIncidentHandler,
  textButton
}) => {
  const [responders, setResponders] = useState([]);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [deletedResponder, setDeletedResponder] = useState();
  const [openResponderDetailsDialog, setOpenResponderDetailsDialog] =
    useState(false);
  const [selectedResponder, setSelectedResponder] = useState();

  // Temporary mock, in the future you need to replace it with an array of real users received from the api
  const commandersArray = useMemo(
    () => [
      {
        label: incident.commander_id.name,
        value: incident.commander_id.id,
        avatar: incident.commander_id.avatar
      }
    ],
    [incident]
  );

  const {
    control,
    // getValues,
    watch
  } = useForm({
    defaultValues: {
      tracking: "123456",
      created_at: incident.created_at,
      chartRoomTitle: "#Slack",
      chartRoom: "https://google.com.ua",
      statusPageTitle: "StatusPage.io",
      statusPage: "https://www.atlassian.com/software/statuspage",
      priority: incident.severity ?? IncidentPriority.High,
      type: typeItems[incident.type] ? incident.type : "",
      commanders: incident.commander_id.id
    }
  });
  watch();
  const DATE_FORMAT = "YYYY-MM-DD HH:mm:ss";
  const formatDate = ({ date, format = DATE_FORMAT, fallback = "-" }) =>
    date ? dayjs(date).format(format) : fallback;
  const dateToDuration = ({ date, withoutSuffix = true, fallback = "-" }) =>
    date ? dayjs(date).fromNow(withoutSuffix) : fallback;

  const watchCreatedAt = watch("created_at");

  const formattedCreatedAt = useMemo(
    () => formatDate({ date: watchCreatedAt }),
    [watchCreatedAt]
  );
  const formattedDuration = useMemo(
    () => dateToDuration({ date: watchCreatedAt }),
    [watchCreatedAt]
  );

  useEffect(() => {
    const subscription = watch(({ priority, type }) => {
      updateIncidentHandler({ severity: priority, type });
    });
    return () => subscription.unsubscribe();
  }, [watch, updateIncidentHandler]);

  const getResponderTitle = (
    properties: AddResponderFormValues & { id: string; title: string }
  ) => {
    return (
      properties.id ||
      properties.title ||
      properties.to ||
      properties.description ||
      properties.person
    );
  };

  async function fetchResponders() {
    try {
      const result = await getRespondersForTheIncident(incident.id);
      const data = (result?.data || []).map((item) => {
        item.properties.external_id = item.external_id || "NA";
        return {
          name: item.team_id?.name,
          type: item.properties.responderType,
          external_id: item.properties.external_id,
          icon:
            item.team_id?.icon &&
            (() => (
              <Icon
                size="md"
                className="inline-block mr-1"
                name={item.team_id.icon}
              />
            )),
          properties: Object.keys(item.properties)
            .map((key) => {
              if (!["responderType"].includes(key)) {
                return ResponderPropsKeyToLabelMap[key]
                  ? {
                      label: ResponderPropsKeyToLabelMap[key],
                      value: item.properties[key]
                    }
                  : undefined;
              }
            })
            .filter((v) => v),
          id: item.id,
          json: item
        };
      });
      setResponders(data);
    } catch (ex) {
      console.error(ex);
    }
  }

  async function initiateDeleteResponder() {
    const id = deletedResponder.id;
    try {
      const result = await deleteResponder(id);
      if (!result?.error) {
        fetchResponders();
        toastSuccess("Responder deleted successfully");
      } else {
        toastError("Responder delete failed");
      }
    } catch (ex) {
      toastError(ex.message);
    }
    setOpenDeleteConfirmDialog(false);
  }

  useEffect(() => {
    if (!incident?.id) {
      return;
    }
    fetchResponders();
  }, [incident]);

  return (
    <div className={clsx("px-6 pt-3.5 divide-y", className)}>
      <div className="mb-4">
        <div className="flex justify-between mb-7">
          <h2 className="mt-0.5 text-2xl font-medium leading-7 text-dark-gray">
            Details
          </h2>
          <span className="relative z-0 inline-flex shadow-sm rounded-md">
            <button
              type="button"
              className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              onClick={updateStatusHandler}
            >
              <RiCloseCircleLine className="mr-1 w-4 h-4" /> {textButton}
            </button>
            <button
              type="button"
              className="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <BsShareFill className="mr-1 w-3 h-3" /> Share
            </button>
          </span>
        </div>
        {/* <IncidentDetailsRow
        title="Chart Room"
        value={
          <a
            href={getValues("chartRoom")}
            className="underline text-dark-blue text-sm font-normal"
          >
            {getValues("chartRoomTitle")}
          </a>
        }
      />
      <IncidentDetailsRow
        title="Status Page"
        className="mt-2.5"
        value={
          <a
            href={getValues("statusPage")}
            className="underline text-dark-blue text-sm font-normal"
          >
            {getValues("statusPageTitle")}
          </a>
        }
      /> */}
        <IncidentDetailsRow
          title="Commanders"
          className="mt-4"
          value={
            <Select
              name="commanders"
              isClearable
              control={control}
              hideSelectedOptions={false}
              components={{
                SingleValue: IncidentCommandersSingleValue,
                Option: IncidentCommandersOption,
                IndicatorSeparator: () => null
              }}
              options={commandersArray}
            />
          }
        />
        <IncidentDetailsRow
          title="Started"
          className="mt-2.5"
          value={
            <span className="text-dark-gray text-sm font-normal">
              {formattedCreatedAt}
            </span>
          }
        />
        <IncidentDetailsRow
          title="Duration"
          className="mt-2.5"
          value={
            <span className="text-dark-gray text-sm font-normal">
              {formattedDuration}
            </span>
          }
        />
        <IncidentDetailsRow
          title="Type"
          className="mt-3"
          value={
            <Dropdown
              control={control}
              label=""
              name="type"
              className="w-full"
              items={typeItems}
            />
          }
        />
        <IncidentDetailsRow
          title="Priority"
          className="mt-3"
          value={
            <Select
              name="priority"
              control={control}
              components={{
                SingleValue: IncidentPrioritySingleValue,
                Option: IncidentPriorityOption,
                IndicatorSeparator: () => null
              }}
              options={priorities}
              isSearchable={false}
            />
          }
        />
      </div>
      <div className="pt-3">
        <div className="flex">
          <h2 className="text-dark-gray text-sm font-medium inline-block flex-1">
            Responders
          </h2>
          <AddResponder
            className="inline-block flex-1 w-full justify-end flex"
            onSuccess={() => fetchResponders()}
          />
        </div>
        {Boolean(responders.length) && (
          <div>
            {responders.map((responder) => {
              return (
                <div
                  key={responder.json.id}
                  className="relative flex hover:bg-gray-100 items-center rounded mt-1 p-2"
                >
                  <div className="flex-1 min-w-0 w-full">
                    <ResponderDetailsToolTip
                      className="w-full"
                      responder={responder}
                      data={responder?.json?.properties}
                      element={
                        <div className="text-dark-gray group text-sm font-medium relative w-full overflow-hidden truncate">
                          <div className="w-full overflow-hidden truncate">
                            {responder.icon && (
                              <responder.icon className="w-6 h-6" />
                            )}
                            <div
                              className="pl-1 inline-block hover:underline cursor-pointer"
                              onClick={(e) => {
                                setOpenResponderDetailsDialog(true);
                                setSelectedResponder(responder);
                              }}
                            >
                              {responder?.name}{" "}
                              <span className="text-xs">
                                ({responder?.external_id})
                              </span>
                            </div>
                          </div>
                          <div className="ml-10 cursor-pointer absolute right-0 top-1">
                            <IconButton
                              className="bg-transparent hidden group-hover:inline-block z-5"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenDeleteConfirmDialog(true);
                                setDeletedResponder(responder);
                              }}
                              ovalProps={{
                                stroke: "blue",
                                height: "18px",
                                width: "18px",
                                fill: "transparent"
                              }}
                              icon={
                                <BsTrash
                                  className="text-gray-600 border-0 border-l-1 border-gray-200"
                                  size={18}
                                />
                              }
                            />
                          </div>
                        </div>
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* {Boolean(responders.length) && (
        <div className="items-center">
          <AddResponder onSuccess={() => fetchResponders()} />
        </div>
      )} */}
      <DeleteConfirmDialog
        isOpen={openDeleteConfirmDialog}
        title="Delete Responder ?"
        description="Are you sure you want to delete the responder ?"
        onClose={() => setOpenDeleteConfirmDialog(false)}
        onDelete={() => {
          initiateDeleteResponder();
        }}
      />
      <ResponderDetailsDialog
        size="medium"
        open={openResponderDetailsDialog}
        responder={selectedResponder}
        data={selectedResponder?.json?.properties}
        onClose={() => {
          setOpenResponderDetailsDialog(false);
        }}
      />
    </div>
  );
};

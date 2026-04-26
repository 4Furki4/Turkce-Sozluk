import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { EntityTypes } from "@/db/schema/requests";

type DiffViewerProps = {
  entityType: EntityTypes;
  currentData: any;
  newData: any;
};

export function RequestDiffViewer({ entityType, currentData, newData }: DiffViewerProps) {
  if (!currentData || !newData) {
    return <p>No data available for comparison</p>;
  }

  // Parse JSON if needed
  const parsedCurrentData = typeof currentData === "string" ? JSON.parse(currentData) : currentData;
  const parsedNewData = typeof newData === "string" ? JSON.parse(newData) : newData;

  // Render different views based on entity type
  switch (entityType) {
    case "word_attributes":
      return <WordAttributeDiff currentData={parsedCurrentData} newData={parsedNewData} />;
    case "words":
      return <WordDiff currentData={parsedCurrentData} newData={parsedNewData} />;
    case "meanings":
      return <MeaningDiff currentData={parsedCurrentData} newData={parsedNewData} />;
    default:
      return <GenericDiff currentData={parsedCurrentData} newData={parsedNewData} />;
  }
}

function WordAttributeDiff({ currentData, newData }: { currentData: any; newData: any }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Word Attribute</h3>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm text-gray-500">New Attribute</p>
            <p className="font-medium">{newData.attribute}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function WordDiff({ currentData, newData }: { currentData: any; newData: any }) {
  const changes = Object.keys(newData).filter(
    (key) => JSON.stringify(currentData[key]) !== JSON.stringify(newData[key])
  );

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Word Changes</h3>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="flex flex-col gap-4">
          {changes.map((key) => (
            <div key={key} className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{key} (Current)</p>
                <p className="font-medium">{formatValue(currentData[key])}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{key} (New)</p>
                <p className="font-medium">{formatValue(newData[key])}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function MeaningDiff({ currentData, newData }: { currentData: any; newData: any }) {
  const changes = Object.keys(newData).filter(
    (key) => JSON.stringify(currentData[key]) !== JSON.stringify(newData[key])
  );

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Meaning Changes</h3>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="flex flex-col gap-4">
          {changes.map((key) => (
            <div key={key} className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{key} (Current)</p>
                <p className="font-medium">{formatValue(currentData[key])}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{key} (New)</p>
                <p className="font-medium">{formatValue(newData[key])}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function GenericDiff({ currentData, newData }: { currentData: any; newData: any }) {
  // For other entity types, show a generic diff view
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Current Data</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <pre className="max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">
            {JSON.stringify(currentData, null, 2)}
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">New Data</h3>
        </CardHeader>
        <Divider />
        <CardBody>
          <pre className="max-h-60 overflow-auto rounded-md bg-gray-100 p-3 text-sm dark:bg-gray-800">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}

// Helper function to format values for display
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return "None";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function getJSONValuesByPath(data: any, path: string): any[] {
  return path.split('.').reduce((values, property) => {
    return values.reduce((newValues, value) => {
      if(!value) {
        return newValues;
      }

      if (value instanceof Array) {
        value.forEach(item => {
          newValues.push(item[property]);
        });
      } else {
        newValues.push(value[property]);
      }
      return newValues;
    }, []);
  }, [data]);
}

export function mergeContributes(...definitions: Record<string, any[]>[]): Record<string, any[]> {
  return definitions.filter(Boolean).reduce((mergedDefinitions, definition) => {
    Object.keys(definition).forEach(keyword => {
      if (!mergedDefinitions[keyword]) {
        mergedDefinitions[keyword] = [];
      }
      mergedDefinitions[keyword].push(...definition[keyword]);
    });
    return mergedDefinitions;
  }, {});
}

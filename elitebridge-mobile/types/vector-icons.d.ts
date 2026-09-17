declare module "@expo/vector-icons/MaterialIcons" {
  import { ComponentType } from "react";
  import { OpaqueColorValue, StyleProp, TextStyle } from "react-native";

  type MaterialIconProps = {
    name: string;
    size?: number;
    color?: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
  };

  const MaterialIcons: ComponentType<MaterialIconProps>;
  export default MaterialIcons;
}

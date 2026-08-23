import { Link } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function IndexPage() {
  return (
    <SafeAreaView style={styles.safeAreaView}>
      <View style={styles.container}>
        <Text style={styles.title}>Вітаю!</Text>

        <View style={styles.buttonContainer}>
          <Link href="/city" style={styles.button}>
            Моє місто
          </Link>
          <Link href="/about" style={styles.buttonSecondary}>
            Про мене
          </Link>
        </View>

        <Text style={styles.subtitle}>Використані технології |٩(˘◡˘)۶|:</Text>
        <View style={styles.blockImage}>
          <Image
            style={styles.image}
            source={require("../assets/images/icon.png")}
          />
          <Image
            style={styles.image}
            source={require("../assets/images/react-logo.png")}
          />
          <Image
            style={styles.image}
            source={{
              uri: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy0mdPbIqXbdV1m-0bH2yKBH4Q3sg6V9KW5tSBTp5VaEciWan7nWx8r00&s=10%22",
            }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#4F46E5",
    marginBottom: 32,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    textAlign: "center",
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    overflow: "hidden",
  },
  buttonSecondary: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#4F46E5",
    paddingVertical: 12,
    borderRadius: 12,
    textAlign: "center",
    color: "#4F46E5",
    fontSize: 18,
    fontWeight: "600",
    overflow: "hidden",
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  blockImage: {
    flexDirection: "row",
    gap: 16,
    padding: 10,
    justifyContent: "center",
  },
});

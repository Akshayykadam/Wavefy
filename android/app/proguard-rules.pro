# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# react-native-track-player
-keep class com.doublesymmetry.trackplayer.** { *; }
-keep interface com.doublesymmetry.trackplayer.** { *; }
-keep class androidx.media3.** { *; }
-keep interface androidx.media3.** { *; }

# standard react native rules
-keep class com.facebook.react.** { *; }
-keep interface com.facebook.react.** { *; }
-keep class com.facebook.proguard.annotations.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

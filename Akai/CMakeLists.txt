cmake_minimum_required(VERSION 3.16)
project(BlondaAkai CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# The sound engines come straight from the SEQ.3 core, so both products always sound the same.
set(CORE ${CMAKE_CURRENT_SOURCE_DIR}/../Core)
add_library(akai_core STATIC
  ${CORE}/src/bris.cpp ${CORE}/src/drums.cpp ${CORE}/src/wg.cpp ${CORE}/src/engines.cpp ${CORE}/src/seq3.cpp
  src/bris_instrument.cpp src/engine_instrument.cpp src/surface.cpp src/app.cpp src/gfx.cpp src/font5x7.cpp src/screen.cpp)
target_include_directories(akai_core PUBLIC include ${CORE}/include)
target_compile_options(akai_core PRIVATE -O3 -Wall -Wextra)

# Desktop: unit tests, live-note tests, real-time checks, CPU benchmark, WAV and screen renders.
add_executable(akai_test tools/akai_test.cpp)
target_link_libraries(akai_test akai_core)
target_compile_options(akai_test PRIVATE -O2 -Wall -Wextra -Wno-mismatched-new-delete)

import math
import tkinter
import turtle
import time
from Simulation import Simulation, Planet, Sun, Blackhole
import numpy as np
import random
from PIL import ImageGrab

class Interface():
    """Handles tkinter and graphical methods."""

    def __init__(self):
        """Setup of the Interface.

        Declares variables for the tkinter interface and calls methods that
        start the simulation.
        """

        self.fov_range      = (200, 4000, 2000)
        self.y_rot_range    = (-90, 90, 0)
        self.default_dist   = 10**12
        self.z_rotation     = 0
        self.frame_count    = 0

        self.start_x_rot    = 0
        self.start_y_rot    = 0

        self.mouse_click1   = False
        self.mouse_click2   = False
        self.mouse_click3   = False
        self.pause          = False
        self.finished       = True

        self.timestep       = 100000  # in seconds, "simulation-time" per frame
        self.timepause      = 50    # pause between frames
        self.theta          = 1
        self.restitution_coefficient = 0  # inelastic collisions, if 1 fully elastic if 0 merge of planets

        self.absolute_pos   = True
        self.focus_index    = 1  # ["none","body","cm"] 0,1,2

        self.show_data      = True
        self.show_time      = True
        self.draw_frame_count = True

        self.path_color     = "darkgrey"

        self.bg_color       = "black"
        self.text_color     = "white"
        self.cube_color     = "green"
        self.font           = ("Courier New", 15, "normal")

        self.star_size_factor = 40
        self.planet_size_factor = 80
        self.min_body_size = .5
        self.path_planet_color = True
        self.draw_box       = True
        self.draw_trail     = True
        self.min_trail_size = .5
        self.trail_length   = 100000
        trail_resolution    = .5  # 0-1
        self.thickness_scale = 2.8 / 3
        self.trail_node_number   = int(self.trail_length * trail_resolution)
        self.trail_node_distance = int(self.trail_length / self.trail_node_number)  # amount of calculations between each node

        self.pointer_size   = 50
        self.onscreen       = []

        self.image_folder   = "C:/Users/gerri/Desktop/data"
        self.get_vid        = False
        self.max_frame      = 3600

        self.draw_rot       = True
        self.node_list_index= 1
        self.node_list      = ["regional", "point", "both"]
        self.node_type      = self.node_list[self.node_list_index]
        self.grid_thickness = 2 * 10**9
        self.rot_cube_pos   = [.8, -.8]  # zwischen -1,1, scale of screen
        self.rot_cube_scale = 80
        self.rot_cube_scolor = "grey"
        self.rot_cube_lcolor = "white"

        self.show_cm        = False
        self.cm_rad         = 10
        self.cm_color       = "white"

        self.map_colors     = False
        self.rainbow_rgb    = rgb_colors()
        self.color_attribute = "acceleration"
        self.max_acceleration = .1
        self.max_velocity   = 5 * 10**5
        self.max_force      = 9, 10**27
        self.color_mode_abs = True

        # mass,density, position, velocity, color (data from the web)
        self.starting_data  = [{'suns':    [('Sun',     1    , 1.41, (0., 0., 0.),     (0., 0., 0.),    'yellow')],
                                'planets': [('Mercury', 0.055, 5.43, (-0.449, 0., 0.), (0., 47.36, 0.), 'orange'),
                                            ('Venus',   0.815, 5.24, (-0.728, 0., 0),  (0., 35.02, 0.), 'yellow'),
                                            ('Earth',   1    , 5.51, (-1, 0, 0.),      (0., 29.78, 0.), 'lightgreen'),
                                            ('Mars',    0.107, 3.93, (-1.658, 0., 0.), (0., 24.08, 0.), 'red')]}]

        # Values for random creation
        self.start_random   = False
        self.size           = 50 * 10000000000  # in 10**(-10) au, len of cube size, has to be big number for randint
        self.max_velo       = 500  # in .15 km/s
        self.number_stars   = 100
        self.number_planets = 0  # trail resolution anpassen
        self.planet_colors  = ["beige", "lightgreen", "lightblue"]
        self.sun_colors     = ["yellow", "orange", "red"]

        # Benchmarking
        self.benchmark      = False
        self.setup_canvas()
        self.setup_simulation()
        self.reset()
        self.window.id = self.window.after(self.timepause, self.update_program)
        self.window.mainloop()

    def setup_canvas(self):
        """Setup of tkinter interface and turtle canvas.

        Creates tkinter widgets and the turtle canvas. Decleration of tkinter
        event bindings for keyboardpress and mouse movements.
        """

        self.window = tkinter.Tk()
        self.window.title("Gravity Simulation")
        self.window.attributes("-fullscreen", True)
        window_size_tuple = self.window.maxsize()
        self.width  = window_size_tuple[0]
        self.height = window_size_tuple[1]

        upper_grid        = tkinter.Frame(self.window)
        button_schließen  = tkinter.Button(upper_grid, text="leave", command=self.window.destroy)
        self.pause_button = tkinter.Button(upper_grid, text="pause", command=self.toggle_pause)
        self.reset_button = tkinter.Button(upper_grid, text="reset", command=self.reset)
        self.canvas       = tkinter.Canvas(self.window, width=window_size_tuple[0], height=window_size_tuple[1])

        upper_grid.pack       (side=tkinter.TOP, fill=tkinter.BOTH, expand=True)
        button_schließen.grid (column=0, row=0, sticky=tkinter.NSEW)
        self.pause_button.grid(column=1, row=0, sticky=tkinter.NSEW)
        self.reset_button.grid(column=2, row=0, sticky=tkinter.NSEW)
        self.canvas.pack      (side=tkinter.TOP, fill=tkinter.BOTH, expand=True)

        for i in range(3):
            tkinter.Grid.columnconfigure(upper_grid, i, weight=1)

        self.fenster = turtle.TurtleScreen(self.canvas)
        self.fenster.tracer(0)
        self.fenster.colormode(255)
        self.fenster.bgcolor(self.bg_color)

        self.pointer = turtle.RawTurtle(self.fenster)
        self.pointer.ht()
        self.pointer.up()

        self.data_pointer = turtle.RawTurtle(self.fenster)
        self.data_pointer.up()
        self.data_pointer.ht()
        self.data_pointer.color(self.text_color)

        self.canvas.bind("<MouseWheel>", self.mouse_scroll)
        self.canvas.bind("<B1-Motion>", self.offset)
        self.canvas.bind("<B2-Motion>", self.change_fov)
        self.canvas.bind("<B3-Motion>", self.rotation)

        self.canvas.bind("<ButtonRelease-1>", lambda event: self.mouse_off(event, "b1"))
        self.canvas.bind("<ButtonRelease-2>", lambda event: self.mouse_off(event, "b2"))
        self.canvas.bind("<ButtonRelease-3>", lambda event: self.mouse_off(event, "b3"))
        self.window.bind("<Left>",  lambda event: self.switch_focus(event, "right"))
        self.window.bind("<Right>", lambda event: self.switch_focus(event, "left"))
        self.window.bind("<Up>",    lambda event: self.switch_focus(event, "right"))
        self.window.bind("<Down>",  lambda event: self.switch_focus(event, "left"))

    def getter(self, widget):
        """Saves screen image of a widget.

        Saves pixel data of a tkinter widget and saves it as an image. Uses
        PIL.ImageGrab.grab().crop((x,y,z,h)) to create an image.

        Args:
            widget: A tkinter widget that will be scanned. Preferably the
                turtle canvas.
        """
        x = self.window.winfo_rootx() + widget.winfo_x()
        y = self.window.winfo_rooty() + widget.winfo_y()
        x1 = x + widget.winfo_width()
        y1 = y + widget.winfo_height()
        image = ImageGrab.grab().crop((x, y, x1, y1))
        image.save(f"{self.image_folder}/frame_{self.frame_count}.gif")

    def switch_focus(self, event, direction):
        if direction == "left":
            self.solar_system.switch_focus("previous")
        elif direction == "right":
            self.solar_system.switch_focus("next")
        if not self.absolute_pos and self.solar_system.focus_type == "body":
            self.solar_system.clear_trail()

    def toggle_pause(self):
        """Binary switch of self.pause"

        Method called by the pause button. Changes text on that button.
        """
        if not self.pause:
            self.pause = True
            self.pause_button.config(text="start")
        else:
            self.pause = False
            self.pause_button.config(text="pause")

    def mouse_off(self, event, button):
        if button == "b1":
            self.mouse_click1 = False
        elif button == "b2":
            self.mouse_click2 = False
        elif button == "b3":
            self.mouse_click3 = False

    def change_fov(self, event):
        if not self.mouse_click2:
            self.old_y = event.y
            self.mouse_click2 = True
        elif self.mouse_click2 and self.finished:
            self.FOV -= (event.y - self.old_y) * 10
            self.old_y = event.y

            if self.FOV < self.fov_range[0]:
                self.FOV = self.fov_range[0]
            elif self.FOV > self.fov_range[1]:
                self.FOV = self.fov_range[1]

    def rotation(self, event):
        if not self.mouse_click3:
            self.old_x = event.x
            self.old_y = event.y
            self.mouse_click3 = True
        elif self.mouse_click3 and self.finished:
            self.y_rotation += (event.x - self.old_x) / 10
            self.x_rotation += (event.y - self.old_y) / 10
            self.old_x = event.x
            self.old_y = event.y

            if self.y_rotation < self.y_rot_range[0]:
                self.y_rotation = self.y_rot_range[0]
            elif self.y_rotation > self.y_rot_range[1]:
                self.y_rotation = self.y_rot_range[1]

    def offset(self, event):
        if not self.mouse_click1:
            self.old_x = event.x
            self.old_y = event.y
            self.mouse_click1 = True
        elif self.mouse_click1 and self.finished:
            self.x_offset += (event.x - self.old_x) * self.distance / 1000
            self.y_offset += (event.y - self.old_y) * self.distance / 1000
            self.old_x = event.x
            self.old_y = event.y

   